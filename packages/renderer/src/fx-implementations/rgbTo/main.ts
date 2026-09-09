import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import { defineEffect } from '../../types.ts';
import code from './shader.wgsl?raw';

export default defineEffect({
	name: 'rgbTo',
	displayName: 'RGB To',
	category: 'utility',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		mode: {
			label: 'Mode',
			type: 'enum',
			options: [{
				label: 'Intensity',
				value: 0,
			}, {
				label: 'Luminance',
				value: 1,
			}],
		},
	},
	getDefaultParams: () => ({
		mode: { type: 'literal', value: 0 },
	}),
	getOut: ({ wgpu, resolution }) => {
		const out = wgpu.device.createTexture({
			size: resolution,
			format: wgpu.enableFloat32Filtering ? 'r32float' : 'r16float',
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
		});
		return out;
	},
	init: ({ wgpu, params, fallbackTexture }) => {
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

		let inputTexture: GPUTexture | null | undefined;
		let bindGroup: GPUBindGroup;
		const updateBindGroup = (texture: GPUTexture | null | undefined) => {
			inputTexture = texture;
			bindGroup = wgpu.device.createBindGroup({
				layout: pipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 1, resource: { buffer: uniformBuffer } },
					//{ binding: 2, resource: sampler },
					{ binding: 2, resource: (texture ?? fallbackTexture).createView() },
				],
			});
		};
		updateBindGroup(params.input);

		return {
			render: (ctx) => {
				if (ctx.params.input !== inputTexture) {
					updateBindGroup(ctx.params.input);
				}

				uniformValues.set({
					mode: ctx.params.mode,
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
