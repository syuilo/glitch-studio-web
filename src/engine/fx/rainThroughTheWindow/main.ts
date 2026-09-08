import { defineEffect } from '@/engine/fx-utils';
import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import code from './shader.wgsl?raw';

export default defineEffect({
	name: 'rainThroughTheWindow',
	displayName: 'Rain Through The Window',
	category: 'effect',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		density: { type: 'range', min: 0, max: 1, step: 0.01, label: 'Density' },
		refraction: { type: 'range', min: 0, max: 2, step: 0.01, label: 'Refraction' },
		fog: { type: 'range', min: 0, max: 1, step: 0.01, label: 'Fog' },
		time: { type: 'number', step: 0.01, label: 'Time (s)' },
		scale: { type: 'range', min: 0.1, max: 5, step: 0.01, label: 'Scale' },
		seed: { type: 'seed', label: 'Seed' },
	},
	getDefaultParams: () => ({
		density: { type: 'literal', value: 0.6 },
		refraction: { type: 'literal', value: 0.8 },
		fog: { type: 'literal', value: 0.35 },
		time: { type: 'expression', value: 'TIME' },
		scale: { type: 'literal', value: 1 },
		seed: { type: 'literal', value: 0 },
	}),
	getOut: ({ wgpu, resolution }) => wgpu.device.createTexture({
		size: resolution,
		format: navigator.gpu.getPreferredCanvasFormat(),
		usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
	}),
	init: ({ wgpu, resolution, params, fallbackTexture }) => {
		const shaderModule = wgpu.device.createShaderModule({ code });
		const pipeline = wgpu.device.createRenderPipeline({
			vertex: { module: wgpu.defaultVertexShaderModule },
			fragment: {
				module: shaderModule,
				targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }],
			},
			primitive: { topology: 'triangle-list' },
			layout: 'auto',
		});
		const definitions = makeShaderDataDefinitions(code);
		const uniformValues = makeStructuredView(definitions.uniforms.uniforms);
		const uniformBuffer = wgpu.device.createBuffer({
			size: uniformValues.arrayBuffer.byteLength,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		const sampler = wgpu.device.createSampler({
			magFilter: 'linear',
			minFilter: 'linear',
			addressModeU: 'clamp-to-edge',
			addressModeV: 'clamp-to-edge',
		});
		let inputTexture = params.input;
		let bindGroup: GPUBindGroup;
		const updateBindGroup = () => {
			bindGroup = wgpu.device.createBindGroup({
				layout: pipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 1, resource: { buffer: uniformBuffer } },
					{ binding: 2, resource: sampler },
					{ binding: 3, resource: (inputTexture ?? fallbackTexture).createView() },
				],
			});
		};
		updateBindGroup();
		// Fold both halves of the numeric seed so fractional seeds also differ.
		const seedValue = new Float64Array(1);
		const seedWords = new Uint32Array(seedValue.buffer);

		return {
			render: (ctx) => {
				if (ctx.params.input !== inputTexture) {
					inputTexture = ctx.params.input;
					updateBindGroup();
				}
				seedValue[0] = ctx.params.seed;
				uniformValues.set({
					aspectRatio: resolution.width / resolution.height,
					density: Math.min(1, Math.max(0, ctx.params.density)),
					refraction: Math.min(2, Math.max(0, ctx.params.refraction)),
					fog: Math.min(1, Math.max(0, ctx.params.fog)),
					time: ctx.params.time,
					scale: Math.min(5, Math.max(0.1, ctx.params.scale)),
					seed: (seedWords[0] ^ seedWords[1]) >>> 0,
				});
				wgpu.device.queue.writeBuffer(uniformBuffer, 0, uniformValues.arrayBuffer);
				const passEncoder = ctx.createPassEncoder(ctx.commandEncoder);
				passEncoder.setPipeline(pipeline);
				passEncoder.setBindGroup(0, bindGroup);
				passEncoder.draw(6);
				passEncoder.end();
			},
			dispose: () => uniformBuffer.destroy(),
		};
	},
});
