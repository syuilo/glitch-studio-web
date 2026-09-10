import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

globalThis.GPUQueue = class { submit() {} writeBuffer() {} };
globalThis.GPUBufferUsage = { QUERY_RESOLVE: 1, COPY_SRC: 2, COPY_DST: 4, MAP_READ: 8, UNIFORM: 16, STORAGE: 32 };
globalThis.GPUTextureUsage = { TEXTURE_BINDING: 1, RENDER_ATTACHMENT: 2, STORAGE_BINDING: 4 };
globalThis.GPUShaderStage = { COMPUTE: 1, VERTEX: 2, FRAGMENT: 4 };
globalThis.GPUMapMode = { READ: 1 };

// Model GPU timestamps at the API boundary: a dispatch costs 1 us, a draw 0.1 us.
// Only passes with timestampWrites contribute to the real renderer's statistics.
function createDevice(canTimestamp) {
	const beginPass = ({ timestampWrites } = {}) => {
		let duration = 0n;
		return {
			setPipeline() {}, setBindGroup() {}, setScissorRect() {}, setBlendConstant() {},
			dispatchWorkgroups() { duration += 1000n; },
			draw() { duration += 100n; },
			end() {
				if (!timestampWrites) return;
				const { querySet, beginningOfPassWriteIndex, endOfPassWriteIndex } = timestampWrites;
				querySet.times[beginningOfPassWriteIndex] = 10n;
				querySet.times[endOfPassWriteIndex] = 10n + duration;
			},
		};
	};
	return {
		features: new Set(canTimestamp ? ['timestamp-query'] : []),
		limits: { minUniformBufferOffsetAlignment: 256, maxStorageBufferBindingSize: 128 * 1024 * 1024, maxBufferSize: 256 * 1024 * 1024, maxTextureDimension2D: 8192 },
		queue: new GPUQueue(),
		createQuerySet: ({ count }) => ({ count, times: new BigUint64Array(count) }),
		createBuffer: ({ size }) => ({
			size, data: new ArrayBuffer(size),
			async mapAsync() {}, getMappedRange() { return this.data; }, unmap() {}, destroy() {},
		}),
		createTexture: () => ({ width: 64, height: 64, createView() { return {}; }, destroy() {} }),
		createShaderModule() { return {}; },
		createComputePipeline() { return { getBindGroupLayout() { return {}; } }; },
		createRenderPipeline() { return { getBindGroupLayout() { return {}; } }; },
		createBindGroupLayout() { return {}; }, createPipelineLayout() { return {}; },
		createBindGroup() { return {}; }, createSampler() { return {}; }, destroy() {},
		createCommandEncoder: () => ({
			beginComputePass: beginPass, beginRenderPass: beginPass, clearBuffer() {},
			resolveQuerySet(querySet, first, count, destination, offset) {
				new BigUint64Array(destination.data, offset, count).set(querySet.times.subarray(first, first + count));
			},
			copyBufferToBuffer(source, sourceOffset, destination, destinationOffset, size) {
				new Uint8Array(destination.data, destinationOffset, size).set(new Uint8Array(source.data, sourceOffset, size));
			},
			finish() { return {}; },
		}),
	};
}

test('effect GPU statistics include compute and render passes', async t => {
	const server = await createServer({
		root: fileURLToPath(new URL('..', import.meta.url)),
		configFile: false,
		server: { middlewareMode: true, hmr: false, watch: null },
		appType: 'custom',
	});
	const previousGpu = navigator.gpu;
	navigator.gpu = { getPreferredCanvasFormat: () => 'bgra8unorm' };
	try {
		const { Renderer } = await server.ssrLoadModule('/src/renderer.ts');
		const { fxDefinitions } = await server.ssrLoadModule('@glitch/shared/fx-definitions.ts');
		const { default: TimingHelper } = await server.ssrLoadModule('/src/TimingHelper.ts');
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
				id: i === count - 1 ? 'effect' : `input-${i}`, type: 'fx', fx, isEnabled: true,
				params: {
					...fxDefinitions[fx].getDefaultParams(), ...patch,
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
						renderer.render('effect', { time: 1000 });
						// Wait for timestamp mapping and the statistics callback.
						await new Promise(resolve => setImmediate(resolve));
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
					}
				});
			}
		}
	} finally {
		navigator.gpu = previousGpu;
		await server.close();
	}
});
