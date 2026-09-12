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
		id, type: 'fx', fx: name, isBypass: true,
		params: {
			...Object.fromEntries(Object.entries(fxDefinitions[name].paramDefs).map(([key, param]) => [
				key, param.default(),
			])),
			...Object.fromEntries(Object.entries(params).map(([key, value]) => [key,
				fxDefinitions[name].paramDefs[key].canNode && typeof value === 'string'
					? { type: 'node', nodeId: value }
					: { type: 'literal', value },
			])),
		},
	});
	const group = (id, nodes) => ({ id, type: 'group', isBypass: true, macros: [], nodes });

	function setup(t, nodes) {
		const device = createDevice(false);
		const passes = [];
		let canvasInput;
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
					else if (inputs.length > 0) canvasInput = inputs[0];
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
			get canvasInput() { return canvasInput; },
			frame(id = 'root') {
				passes.length = 0;
				renderer.render(id, { time: time += 16 });
				return [...passes];
			},
		};
	}

	const disabled = node => ({ ...node, isBypass: false });

	for (const name of ['blend', 'mix', 'dataBlend', 'dataMix']) {
		await t.test(`${name} preserves output precision and renders node-driven amount`, t => {
			const run = setup(t, [fx('a', 'fill'), fx('b', 'fill'), fx('weight', 'multiply'), fx('root', name, { inputA: 'a', inputB: 'b', amount: 'weight' })]);
			const passes = run.frame();
			assert.equal(passes.length, 4);
			assert.equal(passes[3].output.format, name.startsWith('data') ? 'rgba32float' : 'rgba16float');
			assert.deepEqual(passes[3].inputs, passes.slice(0, 3).map(pass => pass.output));
			assert.equal(run.frame().length, 0);
		});
	}

	await t.test('bypasses middle and final nodes, follows live input and restores cached output', t => {
		const a = fx('a', 'multiply', { v: 2 });
		const b = fx('b', 'multiply', { input: 'a', v: 3 });
		const c = fx('root', 'multiply', { input: 'b', v: 4 });
		const run = setup(t, [a, b, c]);
		const initial = run.frame();
		run.renderer.updateNodes([a, disabled(b), c]);
		const bypass = run.frame();
		assert.equal(bypass.length, 1);
		assert.equal(bypass[0].inputs[0], initial[0].output);
		run.renderer.updateNodes([a, b, disabled(c)]);
		run.frame();
		assert.equal(run.canvasInput, initial[1].output);
		run.renderer.updateNodes([a, disabled(b), disabled(c)]);
		run.frame();
		assert.equal(run.canvasInput, initial[0].output);
		run.renderer.updateNodes([fx('a', 'multiply', { v: 5 }), disabled(b), c]);
		assert.equal(run.frame().length, 2, 'input changes invalidate downstream cache');
		run.renderer.updateNodes([a, b, c]);
		assert.equal(run.frame().length, 1, 'unchanged enabled effects may reuse their retained output');
		assert.equal(run.canvasInput, initial[2].output);
		assert.equal(run.frame().length, 0);
	});

	await t.test('retains frame history while an effect is disabled', t => {
		const trail = fx('root', 'pointerTrail');
		const run = setup(t, [trail]);
		const first = run.frame()[0];
		run.renderer.updateNodes([disabled(trail)]);
		assert.equal(run.frame().length, 0);
		run.renderer.updateNodes([trail]);
		const resumed = run.frame()[0];
		assert.equal(resumed.inputs[0], first.output);
		assert.equal(resumed.output, first.inputs[0]);
	});

	await t.test('disabled unconnected effects and groups supply fallback to downstream nodes', t => {
		for (const input of [fx('input', 'multiply'), group('input', [fx('child', 'pointerTrail')])]) {
			const run = setup(t, [disabled(input), fx('root', 'multiply', { input: 'input' })]);
			const passes = run.frame();
			assert.equal(passes.length, 1);
			assert.equal(passes[0].inputs[0].width, 1);
			assert.equal(run.frame().length, 0, 'disabled dynamic descendants do not invalidate cache');
		}
	});

	await t.test('switching a group output to an identical node invalidates downstream cache', t => {
		const a = fx('a', 'multiply');
		const b = fx('b', 'multiply');
		const root = fx('root', 'multiply', { input: 'g' });
		const run = setup(t, [group('g', [a, b]), root]);
		const first = run.frame();
		run.renderer.updateNodes([group('g', [b, a]), root]);
		const second = run.frame();
		assert.equal(second.length, 2);
		assert.notEqual(second[1].inputs[0], first[1].inputs[0]);
	});

	await t.test('disabled blur ignores secondary dependencies and their cycles', t => {
		const run = setup(t, [fx('a', 'pointerTrail'), disabled(fx('b', 'blur', { input: 'a', amount: 'b' })), fx('root', 'multiply', { input: 'b' })]);
		for (let i = 0; i < 2; i++) {
			const passes = run.frame();
			assert.equal(passes.length, 2);
			assert.equal(passes[1].inputs[0], passes[0].output);
		}
	});

	await t.test('disabled generators and groups publish fallback instead of stale output', t => {
		for (const root of [fx('root', 'pointerTrail'), group('root', [fx('child', 'pointerTrail')])]) {
			const run = setup(t, [root]);
			run.frame();
			const previous = run.canvasInput;
			run.renderer.updateNodes([disabled(root)]);
			assert.equal(run.frame().length, 0);
			assert.notEqual(run.canvasInput, previous);
			assert.equal(run.canvasInput.width, 1);
		}
	});

	await t.test('nested groups resolve disabled final children and scalar inputs use fallback', t => {
		const run = setup(t, [fx('a', 'multiply'), group('g', [group('inner', [disabled(fx('b', 'multiply', { input: 'a' }))])]), disabled(fx('empty', 'pointerTrail')), fx('root', 'blur', { input: 'g', amount: 'empty' })]);
		const passes = run.frame();
		assert.equal(passes.length, 2);
		assert.equal(passes[1].inputs[0], passes[0].output);
		assert.equal(passes[1].inputs[1].format, 'r16float');
		assert.equal(passes[1].inputs[1].width, 1);
	});

	await t.test('disabled primary cycles are rejected', t => {
		const { frame } = setup(t, [disabled(fx('root', 'multiply', { input: 'other' })), disabled(fx('other', 'multiply', { input: 'root' }))]);
		assert.throws(() => frame(), /circular dependency detected/);
	});

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
