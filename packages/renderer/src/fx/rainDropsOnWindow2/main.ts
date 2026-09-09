import seedrandom from 'seedrandom';
import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import { defineEffect } from '../../fx-utils.ts';
import code from './shader.wgsl?raw';

export default defineEffect({
	name: 'rainDropsOnWindow2',
	displayName: 'Rain Drops On Window (Type 2)',
	category: 'effect',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		density: { type: 'range', min: 0, max: 1, step: 0.01, label: 'Density' },
		time: { type: 'number', step: 0.01, label: 'Time (s)' },
		scale: { type: 'range', min: 0.1, max: 5, step: 0.01, label: 'Scale' },
		refraction: { type: 'range', min: 0, max: 2, step: 0.01, label: 'Refraction' },
		seed: { type: 'seed', label: 'Seed' },
	},
	getDefaultParams: () => ({
		density: { type: 'literal', value: 0.5 },
		time: { type: 'expression', value: 'TIME' },
		scale: { type: 'literal', value: 1 },
		refraction: { type: 'literal', value: 0.6 },
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
		const uniformValues = makeStructuredView(makeShaderDataDefinitions(code).uniforms.uniforms);
		const uniformBuffer = wgpu.device.createBuffer({
			size: uniformValues.arrayBuffer.byteLength,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		const sampler = wgpu.device.createSampler({
			magFilter: 'linear',
			minFilter: 'linear',
			addressModeU: 'mirror-repeat',
			addressModeV: 'mirror-repeat',
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

		const shortSide = Math.min(resolution.width, resolution.height);
		uniformValues.set({ aspect: [resolution.width / shortSide, resolution.height / shortSide] });
		let previousSeed: number;
		return {
			render: (ctx) => {
				if (ctx.params.input !== inputTexture) {
					inputTexture = ctx.params.input;
					updateBindGroup();
				}
				if (ctx.params.seed !== previousSeed) {
					previousSeed = ctx.params.seed;
					// Keep the full seed on the CPU instead of losing precision in an f32.
					const random = seedrandom(String(previousSeed));
					uniformValues.set({ seed: [random() * 256, random() * 256] });
				}
				uniformValues.set({
					density: Math.min(1, Math.max(0, ctx.params.density)),
					time: ctx.params.time,
					scale: Math.max(0.1, ctx.params.scale),
					refraction: Math.max(0, ctx.params.refraction),
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
