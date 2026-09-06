import { defineEffect } from '@/engine/fx-utils';
import { createTextureFromSource, makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import code from './shader.wgsl?raw';
import { isVideoFrameAvailable } from '@/utility/video.ts';

export default defineEffect({
	name: 'video',
	displayName: 'Video',
	category: '',
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

		const tex = createTextureFromSource(wgpu.device, params.video, {
			mips: false,
		});

		const bindGroup = wgpu.device.createBindGroup({
			layout: pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 1, resource: { buffer: uniformBuffer }},
				{ binding: 2, resource: sampler },
				{ binding: 3, resource: tex.createView() },
			],
		});

		return {
			render: (ctx) => {
				const videoEl = params.video;
				if (isVideoFrameAvailable(videoEl)) {
					// TODO: 動画のフレームが更新された場合のみcopyExternalImageToTextureするようにする
					wgpu.device.queue.copyExternalImageToTexture(
						{ source: videoEl },
						{ texture: tex },
						{ width: tex.width, height: tex.height },
					);
				}
				
				uniformValues.set({
					aspectRatio: resolution.width / resolution.height,
					sourceAspectRatio: tex.width / tex.height,
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
