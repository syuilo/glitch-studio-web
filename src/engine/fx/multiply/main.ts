import { defineEffect } from '@/engine/fx-utils';
import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import code from './shader.wgsl?raw';

export default defineEffect({
	name: 'multiply',
	displayName: 'multiply',
	category: 'utility',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		v: { type: 'range', min: -10, max: 10, step: 0.01, label: 'Value' },
	},
	getDefaultParams: () => ({
		v: { type: 'literal', value: 2 },
	}),
	getOut: ({ wgpu, resolution }) => {
		const out = wgpu.device.createTexture({
			size: resolution,
			format: navigator.gpu.getPreferredCanvasFormat(),
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
		});
		return out;
	},
	init: async ({ wgpu, resolution, params }) => {
		const shaderModule = wgpu.device.createShaderModule({
			code: code,
		});

		const shaderDataDefinitions = makeShaderDataDefinitions(code);

		const pipeline = wgpu.device.createRenderPipeline({
			vertex: {
				module: wgpu.defaultVertexShaderModule,
			},
			fragment: {
				module: shaderModule,
				targets: [{
					format: navigator.gpu.getPreferredCanvasFormat(),
				}],
			},
			primitive: {
				topology: 'triangle-list',
			},
			layout: 'auto',
		});

		const uniformValues = makeStructuredView(shaderDataDefinitions.uniforms.uniforms);

		const uniformBuffer = wgpu.device.createBuffer({
			size: uniformValues.arrayBuffer.byteLength,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		const bindGroup = wgpu.device.createBindGroup({
			layout: pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 1, resource: { buffer: uniformBuffer }},
				//{ binding: 2, resource: sampler },
				{ binding: 2, resource: params.input },
			],
		});

		return {
			render: (ctx) => {
				uniformValues.set({
					v: ctx.params.v,
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
