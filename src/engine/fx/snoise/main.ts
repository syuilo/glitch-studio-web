import { defineEffect } from '@/engine/fx-utils';
import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import code from './shader.wgsl?raw';

export default defineEffect({
	name: 'snoise',
	displayName: 'snoise',
	category: 'utility',
	paramDefs: {
		x: { type: 'range', min: -1, max: 1, step: 0.01, label: 'X' },
		y: { type: 'range', min: -1, max: 1, step: 0.01, label: 'Y' },
	},
	getDefaultParams: () => ({
		x: { type: 'literal', value: 0 },
		y: { type: 'literal', value: 0 },
	}),
	getOut: ({ wgpu, resolution }) => {
		const out = wgpu.device.createTexture({
			size: resolution,
			format: wgpu.enableFloat32Filtering ? 'r32float' : 'r16float',
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
		});
		return out;
	},
	init: ({ wgpu, resolution, params }) => {
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
					format: wgpu.enableFloat32Filtering ? 'r32float' : 'r16float',
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
			],
		});

		return {
			render: (ctx) => {
				uniformValues.set({
					scale: 1,
					time: ctx.time,
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
