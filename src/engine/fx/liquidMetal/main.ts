// Adapted from Paper Design's Liquid Metal (Apache-2.0; see LICENSE).
// Modified for WebGPU and live node inputs; no uploaded-image or shape selector.
import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import code from './shader.wgsl?raw';
import preprocessCode from './preprocess.wgsl?raw';
import { defineEffect } from '@/engine/fx-utils';

export default defineEffect({
	name: 'liquidMetal',
	displayName: 'Liquid Metal',
	category: 'effect',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		colorBack: { type: 'color', label: 'Background color' },
		colorTint: { type: 'color', label: 'Tint color' },
		colorBackAlpha: { type: 'range', label: 'Background alpha', min: 0, max: 1, step: 0.01 },
		colorTintAlpha: { type: 'range', label: 'Tint alpha', min: 0, max: 1, step: 0.01 },
		repetition: { type: 'range', label: 'Repetition', min: 1, max: 10, step: 0.01 },
		softness: { type: 'range', label: 'Softness', min: 0, max: 1, step: 0.01 },
		shiftRed: { type: 'range', label: 'Shift red', min: -1, max: 1, step: 0.01 },
		shiftBlue: { type: 'range', label: 'Shift blue', min: -1, max: 1, step: 0.01 },
		distortion: { type: 'range', label: 'Distortion', min: 0, max: 1, step: 0.01 },
		contour: { type: 'range', label: 'Contour', min: 0, max: 1, step: 0.01 },
		angle: { type: 'range', label: 'Angle', min: 0, max: 360, step: 0.01 },
		scale: { type: 'range', label: 'Scale', min: 0.1, max: 4, step: 0.01 },
		rotation: { type: 'range', label: 'Rotation', min: 0, max: 360, step: 0.01 },
		originX: { type: 'range', label: 'Origin X', min: 0, max: 1, step: 0.01 },
		originY: { type: 'range', label: 'Origin Y', min: 0, max: 1, step: 0.01 },
		offsetX: { type: 'range', label: 'Offset X', min: -1, max: 1, step: 0.01 },
		offsetY: { type: 'range', label: 'Offset Y', min: -1, max: 1, step: 0.01 },
		time: { type: 'number', label: 'Time (s)', step: 0.01 },
		speed: { type: 'number', label: 'Speed', step: 0.01 },
		frame: { type: 'number', label: 'Frame offset (ms)', step: 1 },
		fit: { type: 'enum', label: 'Fit', options: [
			{ value: 0, label: 'None' }, { value: 1, label: 'Contain' }, { value: 2, label: 'Cover' },
		] },
		// Retained upstream sizing options; only procedural shapes used these.
		worldWidth: { type: 'number', label: 'World width (unused for image)', min: 0 },
		worldHeight: { type: 'number', label: 'World height (unused for image)', min: 0 },
	},
	getDefaultParams: () => ({
		colorBack: { type: 'literal', value: [170 / 255, 170 / 255, 172 / 255] },
		colorTint: { type: 'literal', value: [1, 1, 1] },
		colorBackAlpha: { type: 'literal', value: 1 },
		colorTintAlpha: { type: 'literal', value: 1 },
		repetition: { type: 'literal', value: 2 },
		softness: { type: 'literal', value: 0.1 },
		shiftRed: { type: 'literal', value: 0.3 },
		shiftBlue: { type: 'literal', value: 0.3 },
		distortion: { type: 'literal', value: 0.07 },
		contour: { type: 'literal', value: 0.4 },
		angle: { type: 'literal', value: 70 },
		scale: { type: 'literal', value: 0.6 },
		rotation: { type: 'literal', value: 0 },
		originX: { type: 'literal', value: 0.5 },
		originY: { type: 'literal', value: 0.5 },
		offsetX: { type: 'literal', value: 0 },
		offsetY: { type: 'literal', value: 0 },
		time: { type: 'expression', value: 'TIME' },
		speed: { type: 'literal', value: 1 },
		frame: { type: 'literal', value: 0 },
		fit: { type: 'literal', value: 1 },
		worldWidth: { type: 'literal', value: 0 },
		worldHeight: { type: 'literal', value: 0 },
	}),
	getOut: ({ wgpu, resolution }) => wgpu.device.createTexture({
		size: resolution,
		format: navigator.gpu.getPreferredCanvasFormat(),
		usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
	}),
	init: ({ wgpu, resolution, params, fallbackTexture }) => {
		const { device } = wgpu;
		const module = device.createShaderModule({ code });
		const pipeline = device.createRenderPipeline({
			layout: 'auto',
			vertex: { module: wgpu.defaultVertexShaderModule },
			fragment: { module, targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }] },
			primitive: { topology: 'triangle-list' },
		});
		const uniformValues = makeStructuredView(makeShaderDataDefinitions(code).uniforms.uniforms);
		const uniformBuffer = device.createBuffer({ size: uniformValues.arrayBuffer.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
		const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
		const computeLayout = device.createBindGroupLayout({ entries: [
			{ binding: 0, visibility: GPUShaderStage.COMPUTE, texture: {} },
			{ binding: 1, visibility: GPUShaderStage.COMPUTE, sampler: {} },
			{ binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
			{ binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
			{ binding: 4, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: 'rgba16float' } },
		] });
		const computeModule = device.createShaderModule({ code: preprocessCode });
		const layout = device.createPipelineLayout({ bindGroupLayouts: [computeLayout] });
		const makeCompute = (entryPoint: string, constants?: Record<string, number>) => device.createComputePipeline({ layout, compute: { module: computeModule, entryPoint, constants } });
		const initialize = makeCompute('initialize');
		const red = makeCompute('solve', { parity: 0 });
		const black = makeCompute('solve', { parity: 1 });
		const findMaximum = makeCompute('findMaximum');
		const finish = makeCompute('finish');
		const maximum = device.createBuffer({ size: 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
		let inputTexture: GPUTexture | null | undefined;
		let gradient: GPUTexture;
		let pixels: GPUBuffer;
		let computeGroup: GPUBindGroup;
		let renderGroup: GPUBindGroup;
		let width = 0;
		let height = 0;
		const updateInput = (input: GPUTexture | null) => {
			inputTexture = input;
			const source = input ?? fallbackTexture;
			// Always scale to working resolution for consistency, as in upstream.
			// Size to solve Poisson at (will upscale to original size).
			const scale = Math.min(512 / Math.min(source.width, source.height), device.limits.maxTextureDimension2D / Math.max(source.width, source.height));
			const nextWidth = Math.max(1, Math.round(source.width * scale));
			const nextHeight = Math.max(1, Math.round(source.height * scale));
			if (width !== nextWidth || height !== nextHeight) {
				gradient?.destroy();
				pixels?.destroy();
				width = nextWidth;
				height = nextHeight;
				gradient = device.createTexture({ size: [width, height], format: 'rgba16float', usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING });
				pixels = device.createBuffer({ size: width * height * 8, usage: GPUBufferUsage.STORAGE });
			}
			computeGroup = device.createBindGroup({ layout: computeLayout, entries: [
				{ binding: 0, resource: source.createView() },
				{ binding: 1, resource: sampler },
				{ binding: 2, resource: { buffer: pixels } },
				{ binding: 3, resource: { buffer: maximum } },
				{ binding: 4, resource: gradient.createView() },
			] });
			renderGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
				{ binding: 0, resource: { buffer: uniformBuffer } },
				{ binding: 1, resource: sampler },
				{ binding: 2, resource: source.createView() },
				{ binding: 3, resource: gradient.createView() },
			] });
		};
		updateInput(params.input);
		return {
			render: (ctx) => {
				if (ctx.params.input !== inputTexture) updateInput(ctx.params.input);
				const p = ctx.params;
				uniformValues.set({
					...p,
					resolution: [resolution.width, resolution.height],
					colorBack: [...p.colorBack, p.colorBackAlpha],
					colorTint: [...p.colorTint, p.colorTintAlpha],
					// Upstream frame is milliseconds. Explicit time makes seeking deterministic.
					time: p.time * p.speed + p.frame / 1000,
					repetition: Math.max(1, p.repetition),
					scale: Math.max(0.0001, p.scale),
				});
				device.queue.writeBuffer(uniformBuffer, 0, uniformValues.arrayBuffer);
				ctx.commandEncoder.clearBuffer(maximum);
				// Rebuild every frame: animated nodes can change without changing textures.
				// No history or CPU readback; seeking always reproduces the same gradient.
				const compute = ctx.commandEncoder.beginComputePass();
				compute.setBindGroup(0, computeGroup);
				const dispatch = (step: GPUComputePipeline) => {
					compute.setPipeline(step);
					compute.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 8));
				};
				dispatch(initialize);
				// SOR converges ~2-20x faster than standard Gauss-Seidel.
				for (let i = 0; i < 40; i++) {
					dispatch(red);
					dispatch(black);
				}
				dispatch(findMaximum);
				dispatch(finish);
				compute.end();
				const pass = ctx.createPassEncoder(ctx.commandEncoder);
				pass.setPipeline(pipeline);
				pass.setBindGroup(0, renderGroup);
				pass.draw(6);
				pass.end();
			},
			dispose: () => {
				uniformBuffer.destroy();
				maximum.destroy();
				pixels.destroy();
				gradient.destroy();
			},
		};
	},
});
