import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

import { createDevice } from './helpers/gpu-device.mjs';

test('effect GPU statistics include compute and render passes', async t => {
	const server = await createServer({
		root: fileURLToPath(new URL('..', import.meta.url)),
		configFile: false,
		server: { middlewareMode: true, hmr: false, ws: false, watch: null },
		appType: 'custom',
		optimizeDeps: { noDiscovery: true, include: [] },
	});
	const previousGpu = navigator.gpu;
	navigator.gpu = { getPreferredCanvasFormat: () => 'bgra8unorm' };
	try {
		const { Renderer } = await server.ssrLoadModule('/src/renderer.ts');
		const { fxDefinitions } = await server.ssrLoadModule('@glitch/shared/fx-definitions.ts');
		const { default: TimingHelper } = await server.ssrLoadModule('/src/utility/TimingHelper.ts');
		await t.test('worker publishes memory every second even when GPU timing is disabled', async t => {
			const callbacks = new Map();
			const messages = [];
			const previousSelf = globalThis.self;
			const previousOnmessage = globalThis.onmessage;
			globalThis.self = { postMessage: message => messages.push(message) };
			globalThis.onmessage = null;
			t.mock.method(globalThis, 'setInterval', (callback, delay) => { callbacks.set(delay, callback); return 0; });
			const device = createDevice(false);
			navigator.gpu.requestAdapter = async () => ({ requestDevice: async () => device });
			const context = { configure() {}, unconfigure() {}, getCurrentTexture: () => device.createTexture() };
			const canvas = { getContext: () => context };
			try {
				await server.ssrLoadModule('/src/worker.ts');
				await globalThis.onmessage({ data: { type: 'init', canvas, histogramCanvas: canvas, waveformCanvas: canvas, options: {
					resolution: { width: 64, height: 64 }, enableStats: false, enableFloat32Filtering: false,
					fpsLimit: null, assets: [], macros: [], automations: [], nodes: [],
				} } });
				const initial = messages.find(message => message.type === 'gpuMemory');
				assert.ok(initial?.usage.total > 0, 'publish the initial allocation');
				const buffer = device.createBuffer({ size: 1024 });
				callbacks.get(1000)();
				assert.equal(messages.at(-1).usage.total, initial.usage.total + 1024);
				buffer.destroy();
				callbacks.get(1000)();
				assert.deepEqual(messages.at(-1).usage, initial.usage);
				await globalThis.onmessage({ data: { type: 'call', fn: 'destroy', args: [] } });
				callbacks.get(1000)();
				assert.equal(messages.at(-1).usage.total, 0);
			} finally {
				globalThis.self = previousSelf;
				globalThis.onmessage = previousOnmessage;
				delete navigator.gpu.requestAdapter;
			}
		});
		await t.test('timestamp buffers grow across query sets and ignore stale results on shorter frames', async () => {
			const device = createDevice(true);
			const timing = new TimingHelper(device);
			for (const [count, expected] of [[1, 1000], [16, 16000], [17, 17000], [33, 33000], [2, 2000]]) {
				const encoder = device.createCommandEncoder();
				for (let i = 0; i < count; i++) {
					const pass = timing.beginComputePass(encoder);
					pass.dispatchWorkgroups(1);
					pass.end();
				}
				device.queue.submit([encoder.finish()]);
				assert.equal(await timing.getResult(), expected);
			}
		});
		for (const [fx, expected, count] of [['pixelSort', 7.1, 1], ['liquidMetal', 83.1, 1], ['bloom', 1.2, 1], ['bloom', 2.4, 2]]) {
			const makeNodes = (patch = {}) => Array.from({ length: count }, (_, i) => ({
				id: i === count - 1 ? 'effect' : `input-${i}`, type: 'fx', fx, isBypass: true,
				params: {
					...Object.fromEntries(Object.entries(fxDefinitions[fx].paramDefs).map(([key, param]) => [
						key, param.default(),
					])),
					// 現行のliquidMetal実装はRGBに別パラメータのalphaを追加する。
					...(fx === 'liquidMetal' ? {
						colorBack: { type: 'literal', value: [170 / 255, 170 / 255, 172 / 255] },
						colorTint: { type: 'literal', value: [1, 1, 1] },
					} : {}),
					...patch,
					input: { type: 'literal', value: i === 0 ? null : `input-${i - 1}` },
				},
			}));
			for (const [enableStats, canTimestamp] of [[true, true], [false, true], [true, false]]) {
				await t.test(`${count} x ${fx}: stats=${enableStats}, timestamp-query=${canTimestamp}`, async () => {
					const device = createDevice(canTimestamp);
					const context = { configure() {}, unconfigure() {}, getCurrentTexture: () => device.createTexture() };
					const renderer = new Renderer({
						gpuDevice: device, gpuContext: context, histogramGpuContext: context, waveformGpuContext: context,
						resolution: { width: 64, height: 64 }, enableFloat32Filtering: false, enableStats, fpsLimit: null,
						assets: [], macros: [], automations: [],
						nodes: makeNodes(),
					});
					try {
						const initialMemory = renderer.gpuMemory.getUsage();
						assert.ok(initialMemory.total > 0);
						renderer.render('effect', { time: 1000 });
						// Wait for timestamp mapping and the statistics callback.
						await new Promise(resolve => setImmediate(resolve));
						assert.ok(renderer.gpuMemory.getUsage().buffers > initialMemory.buffers, 'include effect-local working buffers');
						assert.equal(renderer.gpuAverageFast.get(), enableStats ? canTimestamp ? expected : 0 : NaN);
						if (enableStats && canTimestamp) {
							// Reusing cached output records no effect passes, then a parameter change resumes timing.
							renderer.render('effect', { time: 1000 });
							await new Promise(resolve => setImmediate(resolve));
							assert.equal(renderer.gpuAverageFast.get(), expected / 2);
							renderer.updateNodes(makeNodes({
								[fx === 'liquidMetal' ? 'speed' : 'threshold']: { type: 'literal', value: 0.25 },
							}));
							renderer.render('effect', { time: 1000 });
							await new Promise(resolve => setImmediate(resolve));
							assert.equal(renderer.gpuAverageFast.get(), expected * 2 / 3);
						}
					} finally {
						renderer.destroy();
						assert.equal(renderer.gpuMemory.getUsage().total, 0);
					}
				});
			}
		}
	} finally {
		navigator.gpu = previousGpu;
		await server.close();
	}
});
