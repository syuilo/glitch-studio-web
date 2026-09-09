// Adapted from Paper Design's Water (Apache-2.0; see LICENSE).
// Modified for WebGPU node inputs, without background or image layout controls.
import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import code from './shader.wgsl?raw';
import { defineEffect } from '@/engine/fx-utils';

export default defineEffect({
	name: 'water',
	displayName: 'Water',
	category: 'effect',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		colorHighlight: { type: 'color', label: 'Highlight color' },
		colorHighlightAlpha: { type: 'range', label: 'Highlight alpha', min: 0, max: 1, step: 0.01 },
		highlights: { type: 'range', label: 'Highlights', min: 0, max: 1, step: 0.01 },
		layering: { type: 'range', label: 'Layering', min: 0, max: 1, step: 0.01 },
		edges: { type: 'range', label: 'Edges', min: 0, max: 1, step: 0.01 },
		waves: { type: 'range', label: 'Waves', min: 0, max: 1, step: 0.01 },
		caustic: { type: 'range', label: 'Caustic', min: 0, max: 1, step: 0.01 },
		size: { type: 'range', label: 'Size', min: 0.01, max: 7, step: 0.01 },
		time: { type: 'number', label: 'Time (s)', step: 0.01 },
		speed: { type: 'number', label: 'Speed', step: 0.01 },
		frame: { type: 'number', label: 'Frame offset (ms)', step: 1 },
	},
	getDefaultParams: () => ({
		colorHighlight: { type: 'literal', value: [1, 1, 1] },
		colorHighlightAlpha: { type: 'literal', value: 1 },
		highlights: { type: 'literal', value: 0.07 },
		layering: { type: 'literal', value: 0.5 },
		edges: { type: 'literal', value: 0.8 },
		waves: { type: 'literal', value: 0.3 },
		caustic: { type: 'literal', value: 0.1 },
		size: { type: 'literal', value: 1 },
		time: { type: 'expression', value: 'TIME' },
		speed: { type: 'literal', value: 1 },
		frame: { type: 'literal', value: 0 },
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
		const uniformBuffer = device.createBuffer({
			size: uniformValues.arrayBuffer.byteLength,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		const sampler = device.createSampler({
			magFilter: 'linear',
			minFilter: 'linear',
			addressModeU: 'mirror-repeat',
			addressModeV: 'mirror-repeat',
		});
		let inputTexture = params.input;
		let bindGroup: GPUBindGroup;
		const updateInput = () => {
			bindGroup = device.createBindGroup({
				layout: pipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 0, resource: { buffer: uniformBuffer } },
					{ binding: 1, resource: sampler },
					{ binding: 2, resource: (inputTexture ?? fallbackTexture).createView() },
				],
			});
		};
		updateInput();
		return {
			render: (ctx) => {
				if (ctx.params.input !== inputTexture) {
					inputTexture = ctx.params.input;
					updateInput();
				}
				const p = ctx.params;
				uniformValues.set({
					...p,
					// The input fills the output; keep the pattern isotropic in that space.
					aspectRatio: resolution.width / resolution.height,
					colorHighlight: [...p.colorHighlight, p.colorHighlightAlpha],
					// Upstream frame is milliseconds; explicit time supports deterministic seeking.
					time: p.time * p.speed + p.frame / 1000,
					size: Math.max(0.01, p.size),
				});
				device.queue.writeBuffer(uniformBuffer, 0, uniformValues.arrayBuffer);
				const pass = ctx.createPassEncoder(ctx.commandEncoder);
				pass.setPipeline(pipeline);
				pass.setBindGroup(0, bindGroup);
				pass.draw(6);
				pass.end();
			},
			dispose: () => uniformBuffer.destroy(),
		};
	},
});
