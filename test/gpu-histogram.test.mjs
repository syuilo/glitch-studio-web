import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';

globalThis.GPUQueue = class {
	submit() {}
};
globalThis.GPUBufferUsage = {
	COPY_DST: 1,
	STORAGE: 2,
};
globalThis.GPUTextureUsage = {
	RENDER_ATTACHMENT: 1,
};
globalThis.GPUShaderStage = {
	COMPUTE: 1,
	VERTEX: 2,
	FRAGMENT: 4,
};

test('histogram canvas registration waits for GPU initialization', async () => {
	const server = await createServer({
		server: { middlewareMode: true },
		appType: 'custom',
	});

	try {
		const { GlitchRenderer } = await server.ssrLoadModule('/src/engine/renderer.ts');
		const renderer = new GlitchRenderer();
		let getContextCalls = 0;
		const canvas = {
			getContext() {
				getContextCalls++;
				return null;
			},
		};

		renderer.setHistogramCanvas(canvas);

		assert.equal(getContextCalls, 0);
	} finally {
		await server.close();
	}
});

test('renderer initializes a histogram canvas registered before the GPU device', async () => {
	const server = await createServer({
		server: { middlewareMode: true },
		appType: 'custom',
	});
	const previousGpu = globalThis.navigator.gpu;

	try {
		const histogramConfigurations = [];
		const device = {
			features: new Set(),
			createBindGroup() { return {}; },
			createBindGroupLayout() { return {}; },
			createBuffer() { return { destroy() {} }; },
			createComputePipeline() { return {}; },
			createPipelineLayout() { return {}; },
			createRenderPipeline() { return {}; },
			createShaderModule() { return {}; },
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
		const histogramCanvas = {
			getContext: () => ({
				configure(configuration) {
					histogramConfigurations.push(configuration);
				},
				unconfigure() {},
			}),
		};
		const { GlitchRenderer } = await server.ssrLoadModule('/src/engine/renderer.ts');
		const renderer = new GlitchRenderer();

		renderer.setHistogramCanvas(histogramCanvas);
		await renderer.init({
			canvas: mainCanvas,
			resolution: { width: 640, height: 480 },
		});

		assert.equal(histogramConfigurations.length, 1);
		assert.equal(histogramConfigurations[0].device, device);
	} finally {
		globalThis.navigator.gpu = previousGpu;
		await server.close();
	}
});

test('renderer disposes the previous GPU histogram before reinitializing', async () => {
	const server = await createServer({
		server: { middlewareMode: true },
		appType: 'custom',
	});
	const previousGpu = globalThis.navigator.gpu;

	try {
		let histogramUnconfigurations = 0;
		const device = {
			features: new Set(),
			createBindGroup() { return {}; },
			createBindGroupLayout() { return {}; },
			createBuffer() { return { destroy() {} }; },
			createComputePipeline() { return {}; },
			createPipelineLayout() { return {}; },
			createRenderPipeline() { return {}; },
			createShaderModule() { return {}; },
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
		const histogramCanvas = {
			getContext: () => ({
				configure() {},
				unconfigure() {
					histogramUnconfigurations++;
				},
			}),
		};
		const { GlitchRenderer } = await server.ssrLoadModule('/src/engine/renderer.ts');
		const renderer = new GlitchRenderer();

		renderer.setHistogramCanvas(histogramCanvas);
		await renderer.init({
			canvas: mainCanvas,
			resolution: { width: 640, height: 480 },
		});
		await renderer.init({
			canvas: mainCanvas,
			resolution: { width: 640, height: 480 },
		});

		assert.equal(histogramUnconfigurations, 1);
	} finally {
		globalThis.navigator.gpu = previousGpu;
		await server.close();
	}
});

test('GPU histogram encodes accumulation, normalization, and drawing every frame', async () => {
	const server = await createServer({
		server: { middlewareMode: true },
		appType: 'custom',
	});

	try {
		const { GpuHistogram } = await server.ssrLoadModule('/src/engine/GpuHistogram.ts');
		const calls = {
			configure: [],
			clearBuffer: [],
			dispatchWorkgroups: [],
			draw: [],
		};
		const histogramBuffer = {
			destroyed: false,
			destroy() {
				this.destroyed = true;
			},
		};
		const context = {
			configure(configuration) {
				calls.configure.push(configuration);
			},
			getCurrentTexture() {
				return { createView: () => 'histogram-target-view' };
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
			createBuffer() {
				return histogramBuffer;
			},
			createBindGroupLayout(descriptor) {
				return { descriptor };
			},
			createPipelineLayout(descriptor) {
				return { descriptor };
			},
			createShaderModule(descriptor) {
				return { descriptor };
			},
			createComputePipeline(descriptor) {
				return { descriptor };
			},
			createRenderPipeline(descriptor) {
				return { descriptor };
			},
			createBindGroup(descriptor) {
				return { descriptor };
			},
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
			createView: () => 'source-view',
		};

		const histogram = new GpuHistogram(device, canvas, 'bgra8unorm');
		histogram.render(commandEncoder, sourceTexture);

		assert.equal(calls.configure.length, 1);
		assert.equal(calls.configure[0].device, device);
		assert.deepEqual(calls.clearBuffer, [[histogramBuffer]]);
		assert.deepEqual(calls.dispatchWorkgroups, [[10, 10], [1]]);
		assert.deepEqual(calls.draw, [[6, 14], [6, 768]]);

		histogram.dispose();
		assert.equal(histogramBuffer.destroyed, true);
	} finally {
		await server.close();
	}
});
