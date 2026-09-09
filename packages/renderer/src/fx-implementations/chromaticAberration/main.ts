import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import { defineEffect } from '../../types.ts';
import code from './shader.wgsl?raw';

export default defineEffect({
	name: 'chromaticAberration',
	displayName: 'Chromatic Aberration',
	category: 'glitch',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		amount: { type: 'range', min: 0, max: 1, step: 0.01, label: 'Amount' },
		rStrength: { type: 'range', min: -10, max: 10, step: 0.01, label: 'R strength' },
		gStrength: { type: 'range', min: -10, max: 10, step: 0.01, label: 'G strength' },
		bStrength: { type: 'range', min: -10, max: 10, step: 0.01, label: 'B strength' },
		samples: { type: 'number', min: 1, max: 100, label: 'Samples' },
		start: { type: 'range', min: 0, max: 1, step: 0.01, label: 'Start' },
		vector: { type: 'vector', step: 0.01, min: -5, max: 5, label: 'Vector' },
		normalize: { type: 'bool', label: 'Normalize' },
		wrap: {
			type: 'enum',
			label: 'Wrap',
			options: [
				{ label: 'Clamp to edge', value: 'clampToEdge' },
				{ label: 'Repeat', value: 'repeat' },
				{ label: 'Repeat (Mirrored)', value: 'repeatMirrored' },
			],
		},
	},
	getDefaultParams: () => ({
		amount: { type: 'literal', value: 0.1 },
		rStrength: { type: 'literal', value: 1 },
		gStrength: { type: 'literal', value: 1.5 },
		bStrength: { type: 'literal', value: 2 },
		samples: { type: 'literal', value: 32 },
		start: { type: 'literal', value: 0 },
		vector: { type: 'literal', value: [0, 0] },
		normalize: { type: 'literal', value: false },
		wrap: { type: 'literal', value: 'repeatMirrored' },
	}),
	getOut: ({ wgpu, resolution }) => {
		return wgpu.device.createTexture({
			size: resolution,
			format: navigator.gpu.getPreferredCanvasFormat(),
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
		});
	},
	init: ({ wgpu, params, fallbackTexture }) => {
		const shaderModule = wgpu.device.createShaderModule({ code });
		const shaderDataDefinitions = makeShaderDataDefinitions(code);
		const pipeline = wgpu.device.createRenderPipeline({
			vertex: { module: wgpu.defaultVertexShaderModule },
			fragment: {
				module: shaderModule,
				targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }],
			},
			primitive: { topology: 'triangle-list' },
			layout: 'auto',
		});

		const uniformValues = makeStructuredView(shaderDataDefinitions.uniforms.uniforms);
		const uniformBuffer = wgpu.device.createBuffer({
			size: uniformValues.arrayBuffer.byteLength,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		const samplers = {
			clampToEdge: wgpu.device.createSampler({
				magFilter: 'linear',
				minFilter: 'linear',
				addressModeU: 'clamp-to-edge',
				addressModeV: 'clamp-to-edge',
			}),
			repeat: wgpu.device.createSampler({
				magFilter: 'linear',
				minFilter: 'linear',
				addressModeU: 'repeat',
				addressModeV: 'repeat',
			}),
			repeatMirrored: wgpu.device.createSampler({
				magFilter: 'linear',
				minFilter: 'linear',
				addressModeU: 'mirror-repeat',
				addressModeV: 'mirror-repeat',
			}),
		};

		let inputTexture = params.input;
		let wrap = params.wrap;
		let bindGroup: GPUBindGroup;
		const updateBindGroup = () => {
			bindGroup = wgpu.device.createBindGroup({
				layout: pipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 1, resource: { buffer: uniformBuffer } },
					{ binding: 2, resource: samplers[wrap] },
					{ binding: 3, resource: (inputTexture ?? fallbackTexture).createView() },
				],
			});
		};
		updateBindGroup();

		return {
			render: (ctx) => {
				if (ctx.params.input !== inputTexture || ctx.params.wrap !== wrap) {
					inputTexture = ctx.params.input;
					wrap = ctx.params.wrap;
					updateBindGroup();
				}

				uniformValues.set({
					amount: ctx.params.amount,
					rStrength: ctx.params.rStrength,
					gStrength: ctx.params.gStrength,
					bStrength: ctx.params.bStrength,
					samples: ctx.params.samples,
					start: ctx.params.start,
					vector: ctx.params.vector,
					normalize: ctx.params.normalize ? 1 : 0,
				});
				wgpu.device.queue.writeBuffer(uniformBuffer, 0, uniformValues.arrayBuffer);

				const passEncoder = ctx.createPassEncoder(ctx.commandEncoder);
				passEncoder.setPipeline(pipeline);
				passEncoder.setBindGroup(0, bindGroup);
				passEncoder.draw(6);
				passEncoder.end();
			},
			dispose: () => {
				uniformBuffer.destroy();
			},
		};
	},
});
