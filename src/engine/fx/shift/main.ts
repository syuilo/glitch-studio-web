import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import code from './shader.wgsl?raw';
import { defineEffect } from '@/engine/fx-utils';

export default defineEffect({
	name: 'shift',
	displayName: 'Shift',
	category: 'utility',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		amount: { type: 'vector', min: -1, max: 1, step: 0.01, label: 'Amount' },
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
		amount: { type: 'literal', value: [0, 0] },
		wrap: { type: 'literal', value: 'repeatMirrored' },
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
