import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createDevice } from './helpers/gpu-device.mjs';

test('renderer graph traversal and frame history', async t => {
	const server = await createServer({
		root: fileURLToPath(new URL('..', import.meta.url)), configFile: false,
		server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom',
		optimizeDeps: { noDiscovery: true, include: [] },
	});
	t.after(() => server.close());
	const previousGpu = navigator.gpu;
	navigator.gpu = { getPreferredCanvasFormat: () => 'bgra8unorm' };
	t.after(() => { navigator.gpu = previousGpu; });
	const { Renderer } = await server.ssrLoadModule('/src/renderer.ts');
	const { fxDefinitions } = await server.ssrLoadModule('@glitch/shared/fx-definitions.ts');
	const fx = (id, name, params = {}) => ({
		id, type: 'fx', fx: name, isEnabled: true,
		params: {
			...fxDefinitions[name].getDefaultParams(),
			...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, { type: 'literal', value }])),
		},
	});
	const group = (id, nodes) => ({ id, type: 'group', isEnabled: true, macros: [], nodes });

	function setup(t, nodes) {
		const device = createDevice(false);
		const passes = [];
		// Keep the real Renderer and effects; record texture bindings at the GPU boundary.
		device.createBindGroup = descriptor => descriptor;
		const createEncoder = device.createCommandEncoder;
		device.createCommandEncoder = () => {
			const encoder = createEncoder();
			const beginPass = encoder.beginRenderPass;
			encoder.beginRenderPass = descriptor => {
				const pass = beginPass(descriptor);
				const output = descriptor.colorAttachments[0].view.texture;
				const inputs = [];
				pass.setBindGroup = (_, bindGroup) => {
					for (const { resource } of bindGroup.entries) {
						if (resource.texture) inputs.push(resource.texture);
					}
				};
				pass.draw = () => {
					assert.ok(!inputs.includes(output), 'a render pass must not read its output texture');
					if (!output.canvas) passes.push({ output, inputs: [...inputs] });
				};
				return pass;
			};
			return encoder;
		};
		const context = {
			configure() {}, unconfigure() {},
			getCurrentTexture: () => Object.assign(device.createTexture(), { canvas: true }),
		};
		const renderer = new Renderer({
			gpuDevice: device, gpuContext: context, histogramGpuContext: context, waveformGpuContext: context,
			resolution: { width: 64, height: 64 }, enableFloat32Filtering: false, enableStats: false,
			fpsLimit: null, assets: [], macros: [], automations: [], nodes,
		});
		t.after(() => renderer.destroy());
		let time = performance.now();
		return {
			renderer,
			frame(id = 'root') {
				passes.length = 0;
				renderer.render(id, { time: time += 16 });
				return [...passes];
			},
		};
	}

	for (const grouped of [false, true]) {
		await t.test(`shared ${grouped ? 'group' : 'node'} renders once per frame and publishes alternating history`, t => {
			const trail = fx('trail', 'pointerTrail');
			const shared = fx('shared', 'multiply', { input: 'trail' });
			const input = grouped ? 'group' : 'shared';
			const nodes = grouped ? [group('group', [trail, shared])] : [trail, shared];
			nodes.push(fx('root', 'blur', { input, amount: input }));
			const { frame } = setup(t, nodes);
			const first = frame();
			assert.equal(first.length, 3, 'trail, shared and root each draw once');
			assert.equal(first[0].output.format, 'rg16float');
			assert.equal(first[1].inputs[0], first[0].output, 'downstream reads this frame');
			assert.deepEqual(first[2].inputs, [first[1].output, first[1].output]);
			const second = frame();
			assert.equal(second.length, 3, 'rendered set resets on the next frame');
			assert.equal(second[0].inputs[0], first[0].output);
			assert.equal(second[0].output, first[0].inputs[0]);
			assert.equal(second[1].inputs[0], second[0].output);
			const third = frame();
			assert.equal(third[0].output, first[0].output);
			assert.equal(third[0].inputs[0], second[0].output);
		});
	}

	for (const [name, nodes] of [
		['self reference', [fx('root', 'multiply', { input: 'root' })]],
		['two-node cycle', [fx('root', 'multiply', { input: 'other' }), fx('other', 'multiply', { input: 'root' })]],
		['group cycle', [group('root', [fx('child', 'multiply', { input: 'root' })])]],
		// Dynamic dependencies make evalCacheKey return null before reaching the cycle.
		// This exercises renderNode's own cycle detection, not only evalCacheKey's.
		['cycle with uncached input', [fx('trail', 'pointerTrail'), fx('root', 'blur', { input: 'trail', amount: 'root' })]],
	]) {
		await t.test(`rejects ${name}`, t => {
			const { frame } = setup(t, nodes);
			assert.throws(() => frame(), /circular dependency detected/);
		});
	}

	await t.test('static output is cached across frames and parameter changes invalidate it', t => {
		const { renderer, frame } = setup(t, [fx('root', 'multiply', { input: null, v: 2 })]);
		const first = frame();
		assert.equal(first.length, 1);
		assert.equal(frame().length, 0);
		renderer.updateNodes([fx('root', 'multiply', { input: null, v: 3 })]);
		const changed = frame();
		assert.equal(changed.length, 1);
		assert.equal(changed[0].output, first[0].output, 'ordinary effects retain their output');
	});

	await t.test('empty groups and absent output nodes do not draw', t => {
		const { frame } = setup(t, [group('root', [])]);
		assert.deepEqual(frame(), []);
		assert.deepEqual(frame('missing'), []);
	});
});
