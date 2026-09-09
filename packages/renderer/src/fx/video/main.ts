import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import { defineEffect } from '../../fx-utils.ts';
import code from './shader.wgsl?raw';

export default defineEffect({
	name: 'video',
	displayName: 'Video',
	category: '',
	disableCache: true,
	paramDefs: {
		video: {
			label: 'Video',
			type: 'video',
		},
		sizeMode: {
			label: 'Size mode',
			type: 'enum',
			options: [{
				label: 'Stretch',
				value: 0,
			}, {
				label: 'Cover',
				value: 1,
			}, {
				label: 'Contain',
				value: 2,
			}],
		},
	},
	getDefaultParams: () => ({
		video: { type: 'literal', value: null },
		sizeMode: { type: 'literal', value: 1 },
	}),
	getOut: ({ wgpu, resolution }) => {
		const out = wgpu.device.createTexture({
			size: resolution,
			format: navigator.gpu.getPreferredCanvasFormat(),
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
		});
		return out;
	},
	init: ({ wgpu, resolution, params, fallbackTexture }) => {
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

		const sampler = wgpu.device.createSampler({
			magFilter: 'linear',
			minFilter: 'linear',
			mipmapFilter: 'linear',
			addressModeU: 'mirror-repeat',
			addressModeV: 'mirror-repeat',
			addressModeW: 'mirror-repeat',
		});

		let bindGroup: GPUBindGroup | null = null;

		return {
			render: (ctx) => {
				if (!ctx.params.video) {
					bindGroup = null;
					return;
				}
				if (ctx.params.video) {
					const freshTex = wgpu.device.importExternalTexture(
						{ source: ctx.params.video },
					);
					bindGroup = wgpu.device.createBindGroup({
						layout: pipeline.getBindGroupLayout(0),
						entries: [
							{ binding: 1, resource: { buffer: uniformBuffer } },
							{ binding: 2, resource: sampler },
							{ binding: 3, resource: freshTex },
						],
					});
				}
				if (bindGroup == null) return;

				uniformValues.set({
					aspectRatio: resolution.width / resolution.height,
					mode: ctx.params.sizeMode,
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
