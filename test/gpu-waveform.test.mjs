import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';
import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';

globalThis.GPUQueue = class {
	submit() {}
};
globalThis.GPUBufferUsage = {
	COPY_DST: 1,
	STORAGE: 2,
	UNIFORM: 4,
};

test('engine initializes a waveform canvas registered before the GPU device', async () => {
	const server = await createServer({
		server: { middlewareMode: true, hmr: false },
		appType: 'custom',
	});
	const previousGpu = globalThis.navigator.gpu;

	try {
		const waveformConfigurations = [];
		const device = {
			features: new Set(),
			createTexture() { return { destroy() {} }; },
			createBindGroup() { return {}; },
			createBindGroupLayout() { return {}; },
			createBuffer() { return { destroy() {} }; },
			createComputePipeline() { return {}; },
			createPipelineLayout() { return {}; },
			createRenderPipeline() { return {}; },
			createShaderModule() { return {}; },
			destroy() {},
		};
		globalThis.navigator.gpu = {
			getPreferredCanvasFormat: () => 'bgra8unorm',
			requestAdapter: async () => ({
				features: new Set(),
				requestDevice: async () => device,
			}),
		};
		const mainCanvas = {
			width: 0,
			height: 0,
			getContext: () => ({ configure() {} }),
		};
		const waveformCanvas = {
			getContext: () => ({
				configure(configuration) {
					waveformConfigurations.push(configuration);
				},
				unconfigure() {},
			}),
		};
		const { Engine } = await server.ssrLoadModule('/src/engine/engine.ts');
		const engine = new Engine();

		engine.setWaveformCanvas(waveformCanvas);
		await engine.init({
			canvas: mainCanvas,
			resolution: { width: 640, height: 480 },
		});

		assert.equal(waveformConfigurations.length, 1);
		assert.equal(waveformConfigurations[0].device, device);
	} finally {
		globalThis.navigator.gpu = previousGpu;
		await server.close();
	}
});
globalThis.GPUTextureUsage = {
	RENDER_ATTACHMENT: 1,
};
globalThis.GPUShaderStage = {
	COMPUTE: 1,
	FRAGMENT: 2,
};

test('waveform sampling caps the longest edge at 1024 pixels', async () => {
	const server = await createServer({
		server: { middlewareMode: true, hmr: false },
		appType: 'custom',
	});

	try {
		const { fitWaveformSampleSize } = await server.ssrLoadModule('/src/engine/GpuWaveform.ts');

		assert.deepEqual(fitWaveformSampleSize(640, 480), { width: 640, height: 480 });
		assert.deepEqual(fitWaveformSampleSize(4096, 2048), { width: 1024, height: 512 });
		assert.deepEqual(fitWaveformSampleSize(2048, 4096), { width: 512, height: 1024 });
	} finally {
		await server.close();
	}
});

test('waveform component exposes its monitor canvas accessibly', async () => {
	const server = await createServer({
		server: { middlewareMode: true, hmr: false },
		appType: 'custom',
	});

	try {
		const { default: Waveform } = await server.ssrLoadModule('/src/components/waveform.vue');
		const html = await renderToString(createSSRApp(Waveform, {
			engine: { setWaveformCanvas() {} },
		}));

		assert.match(html, /<canvas[^>]+role="img"/);
		assert.match(html, /aria-label="RGB waveform"/);
	} finally {
		await server.close();
	}
});

test('GPU waveform downsamples a large source and draws it in the same frame', async () => {
	const server = await createServer({
		server: { middlewareMode: true, hmr: false },
		appType: 'custom',
	});

	try {
		const { GpuWaveform } = await server.ssrLoadModule('/src/engine/GpuWaveform.ts');
		const calls = {
			configure: [],
			writeBuffer: [],
			clearBuffer: [],
			dispatchWorkgroups: [],
			draw: [],
		};
		const buffers = [];
		const context = {
			configure(configuration) {
				calls.configure.push(configuration);
			},
			getCurrentTexture() {
				return { createView: () => 'waveform-target-view' };
			},
			unconfigure() {},
		};
		const canvas = {
			getContext(type) {
				assert.equal(type, 'webgpu');
				return context;
			},
		};
		const device = {
			queue: {
				writeBuffer(buffer, offset, data) {
					calls.writeBuffer.push([buffer, offset, Array.from(data)]);
				},
			},
			createBuffer(descriptor) {
				const buffer = {
					descriptor,
					destroyed: false,
					destroy() {
						this.destroyed = true;
					},
				};
				buffers.push(buffer);
				return buffer;
			},
			createBindGroupLayout(descriptor) { return { descriptor }; },
			createPipelineLayout(descriptor) { return { descriptor }; },
			createShaderModule(descriptor) { return { descriptor }; },
			createComputePipeline(descriptor) { return { descriptor }; },
			createRenderPipeline(descriptor) { return { descriptor }; },
			createBindGroup(descriptor) { return { descriptor }; },
		};
		const computePass = {
			setPipeline() {},
			setBindGroup() {},
			dispatchWorkgroups(...args) {
				calls.dispatchWorkgroups.push(args);
			},
			end() {},
		};
		const renderPass = {
			setPipeline() {},
			setBindGroup() {},
			draw(...args) {
				calls.draw.push(args);
			},
			end() {},
		};
		const commandEncoder = {
			clearBuffer(...args) {
				calls.clearBuffer.push(args);
			},
			beginComputePass() {
				return computePass;
			},
			beginRenderPass() {
				return renderPass;
			},
		};
		const sourceTexture = {
			width: 4096,
			height: 2048,
			createView: () => 'source-view',
		};

		const waveform = new GpuWaveform(device, canvas, 'bgra8unorm');
		waveform.render(commandEncoder, sourceTexture);

		assert.equal(calls.configure.length, 1);
		assert.deepEqual(calls.writeBuffer.map(([, offset, data]) => [offset, data]), [
			[0, [1024, 512]],
		]);
		assert.deepEqual(calls.clearBuffer, [[buffers[0]]]);
		assert.deepEqual(calls.dispatchWorkgroups, [[64, 32]]);
		assert.deepEqual(calls.draw, [[6]]);

		waveform.dispose();
		assert.equal(buffers.every(buffer => buffer.destroyed), true);
	} finally {
		await server.close();
	}
});
