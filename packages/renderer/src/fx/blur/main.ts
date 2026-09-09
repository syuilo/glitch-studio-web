import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import { defineEffect } from '../../fx-utils.ts';
import code from './shader.wgsl?raw';

export default defineEffect({
	name: 'blur',
	displayName: 'Blur',
	category: 'effect',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		amount: { type: 'node', label: 'Amount' },
		samples: { type: 'range', label: 'Samples', min: 4, max: 256, step: 1 },
	},
	getDefaultParams: () => ({
		amount: { type: 'literal', value: null },
		samples: { type: 'literal', value: 16 },
	}),
	getOut: ({ wgpu, resolution }) => {
		return wgpu.device.createTexture({
			size: resolution,
			format: navigator.gpu.getPreferredCanvasFormat(),
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
		});
	},
	init: ({ wgpu, params, resolution, fallbackTexture }) => {
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
		const sampler = wgpu.device.createSampler({
			magFilter: 'linear',
			minFilter: 'linear',
			addressModeU: 'mirror-repeat',
			addressModeV: 'mirror-repeat',
		});

		let inputTexture = params.input;
		let amountTexture = params.amount;
		let bindGroup: GPUBindGroup;
		const updateBindGroup = () => {
			bindGroup = wgpu.device.createBindGroup({
				layout: pipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 1, resource: { buffer: uniformBuffer } },
					{ binding: 2, resource: sampler },
					{ binding: 3, resource: (inputTexture ?? fallbackTexture).createView() },
					{ binding: 4, resource: (amountTexture ?? fallbackTexture).createView() },
				],
			});
		};
		updateBindGroup();

		return {
			render: (ctx) => {
				if (ctx.params.input !== inputTexture || ctx.params.amount !== amountTexture) {
					inputTexture = ctx.params.input;
					amountTexture = ctx.params.amount;
					updateBindGroup();
				}

				uniformValues.set({
					aspectRatio: resolution.width / resolution.height,
					samples: ctx.params.samples,
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
