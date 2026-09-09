import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import { defineEffect } from '../../types.ts';
import code from './shader.wgsl?raw';

// A fixed working grid AND level count keep the normalized bloom footprint
// unchanged when rendering the same composition at another output resolution.
const workingSize = 512;
const levelCount = 6;

export default defineEffect({
	name: 'bloom',
	displayName: 'Bloom',
	category: 'effect',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		strength: { type: 'range', label: 'Strength', min: 0, max: 5, step: 0.01 },
		threshold: { type: 'range', label: 'Threshold', min: 0, max: 1, step: 0.01 },
		softKnee: { type: 'range', label: 'Soft knee', min: 0, max: 1, step: 0.01 },
		radius: { type: 'range', label: 'Radius', min: 0, max: 1, step: 0.01 },
	},
	getDefaultParams: () => ({
		strength: { type: 'literal', value: 1 },
		threshold: { type: 'literal', value: 0.7 },
		softKnee: { type: 'literal', value: 0.5 },
		radius: { type: 'literal', value: 0.7 },
	}),
	getOut: ({ wgpu, resolution }) => wgpu.device.createTexture({
		size: resolution,
		format: navigator.gpu.getPreferredCanvasFormat(),
		usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
	}),
	init: ({ wgpu, params, resolution, fallbackTexture }) => {
		const { device } = wgpu;
		const module = device.createShaderModule({ code });
		const uniformValues = makeStructuredView(makeShaderDataDefinitions(code).uniforms.uniforms);
		const uniformBuffer = device.createBuffer({
			size: uniformValues.arrayBuffer.byteLength,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
		const bindGroupLayout = device.createBindGroupLayout({
			entries: [
				{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
				{ binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
				{ binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
				{ binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
			],
		});
		const layout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });
		const makePipeline = (entryPoint: string, format: GPUTextureFormat, blend?: GPUBlendState) => device.createRenderPipeline({
			layout,
			vertex: { module: wgpu.defaultVertexShaderModule },
			fragment: { module, entryPoint, targets: [{ format, blend }] },
			primitive: { topology: 'triangle-list' },
		});
		// Half floats preserve faint highlights through repeated filtering.
		const prefilterPipeline = makePipeline('prefilter', 'rgba16float');
		const downsamplePipeline = makePipeline('downsample', 'rgba16float');
		// Blend into the finer level in place; no second pyramid or detail sample.
		const blend: GPUBlendComponent = { srcFactor: 'constant', dstFactor: 'one-minus-constant' };
		const upsamplePipeline = makePipeline('upsample', 'rgba16float', { color: blend, alpha: blend });
		const compositePipeline = makePipeline('composite', navigator.gpu.getPreferredCanvasFormat());
		const longestSide = Math.max(resolution.width, resolution.height);
		const levels = Array.from({ length: levelCount }, (_, i) => {
			const scale = workingSize / longestSide / 2 ** i;
			const texture = device.createTexture({
				size: [Math.max(1, Math.round(resolution.width * scale)), Math.max(1, Math.round(resolution.height * scale))],
				format: 'rgba16float',
				usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
			});
			return { texture, view: texture.createView() };
		});
		const makeBindGroup = (source: GPUTextureView, detail = source) => device.createBindGroup({
			layout: bindGroupLayout,
			entries: [
				{ binding: 0, resource: { buffer: uniformBuffer } },
				{ binding: 1, resource: sampler },
				{ binding: 2, resource: source },
				{ binding: 3, resource: detail },
			],
		});
		const makePass = (view: GPUTextureView, loadOp: GPULoadOp = 'clear'): GPURenderPassDescriptor => ({
			colorAttachments: [{ view, loadOp, storeOp: 'store', clearValue: [0, 0, 0, 0] }],
		});
		const downPasses = levels.map(({ view }) => makePass(view));
		const upPasses = levels.slice(0, -1).map(({ view }) => makePass(view, 'load'));
		const downGroups = levels.slice(0, -1).map(({ view }) => makeBindGroup(view));
		const upGroups = levels.slice(1).map(({ view }) => makeBindGroup(view));
		let inputTexture: GPUTexture | null | undefined;
		let prefilterGroup: GPUBindGroup;
		let compositeGroup: GPUBindGroup;
		const updateInput = (input: GPUTexture | null) => {
			inputTexture = input;
			const view = (input ?? fallbackTexture).createView();
			prefilterGroup = makeBindGroup(view);
			compositeGroup = makeBindGroup(view, levels[0].view);
		};
		updateInput(params.input);
		const draw = (pass: GPURenderPassEncoder, pipeline: GPURenderPipeline, group: GPUBindGroup) => {
			pass.setPipeline(pipeline);
			pass.setBindGroup(0, group);
			pass.draw(6);
			pass.end();
		};
		const clamp = (value: number, max: number, fallback: number) => Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : fallback;

		return {
			render: (ctx) => {
				if (ctx.params.input !== inputTexture) updateInput(ctx.params.input);
				const strength = inputTexture == null ? 0 : clamp(ctx.params.strength, 5, 1);
				const radius = clamp(ctx.params.radius, 1, 0.7);
				uniformValues.set({
					strength,
					threshold: clamp(ctx.params.threshold, 1, 0.7),
					softKnee: clamp(ctx.params.softKnee, 1, 0.5),
					prefilterTexel: [1 / levels[0].texture.width, 1 / levels[0].texture.height],
				});
				device.queue.writeBuffer(uniformBuffer, 0, uniformValues.arrayBuffer);
				if (strength > 0) {
					// Internal passes bypass the renderer's limited timestamp query pool.
					draw(ctx.commandEncoder.beginRenderPass(downPasses[0]), prefilterPipeline, prefilterGroup);
					if (radius > 0) {
						for (let i = 1; i < levelCount; i++) {
							draw(ctx.commandEncoder.beginRenderPass(downPasses[i]), downsamplePipeline, downGroups[i - 1]);
						}
						for (let i = levelCount - 2; i >= 0; i--) {
							const pass = ctx.commandEncoder.beginRenderPass(upPasses[i]);
							// Normalized weights preserve brightness while shifting energy
							// toward coarser scales as radius increases.
							pass.setBlendConstant([radius, radius, radius, radius]);
							draw(pass, upsamplePipeline, upGroups[i]);
						}
					}
				}
				draw(ctx.createPassEncoder(ctx.commandEncoder), compositePipeline, compositeGroup);
			},
			dispose: () => {
				uniformBuffer.destroy();
				for (const { texture } of levels) texture.destroy();
			},
		};
	},
});
