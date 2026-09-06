import { defineEffect } from '@/engine/fx-utils';
import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import code from './shader.wgsl?raw';

export default defineEffect({
	name: 'quadtreeFilter',
	displayName: 'Quadtree filter',
	category: 'effect',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		threshold: { type: 'range', min: 0, max: 0.15, step: 0.00001, label: 'Thresold' },
		minDivisions: { type: 'range', min: 1, max: 64, step: 1, label: 'Min divisions' },
		maxIterations: { type: 'range', min: 1, max: 16, step: 1, label: 'Max iterations' },
		borderWidth: { type: 'range', min: 0, max: 1, step: 0.001, label: 'Border width' },
		borderAbsolute: { type: 'bool', label: 'Border absolute' },
	},
	getDefaultParams: () => ({
		threshold: { type: 'literal', value: 0.005 },
		minDivisions: { type: 'literal', value: 4 },
		maxIterations: { type: 'literal', value: 10 },
		borderWidth: { type: 'literal', value: 0 },
		borderAbsolute: { type: 'literal', value: false },
	}),
	getOut: ({ wgpu, resolution }) => {
		const out = wgpu.device.createTexture({
			size: resolution,
			format: navigator.gpu.getPreferredCanvasFormat(),
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
			magFilter: 'nearest',
			minFilter: 'nearest',
			addressModeU: 'clamp-to-edge',
			addressModeV: 'clamp-to-edge',
		});

		let inputTexture: GPUTexture | null | undefined;
		let bindGroup: GPUBindGroup;
		const updateBindGroup = (texture: GPUTexture | null | undefined) => {
			inputTexture = texture;
			bindGroup = wgpu.device.createBindGroup({
				layout: pipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 1, resource: { buffer: uniformBuffer }},
					{ binding: 2, resource: sampler },
					{ binding: 3, resource: (texture ?? fallbackTexture).createView() },
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
					minDivisions: ctx.params.minDivisions,
					maxIterations: ctx.params.maxIterations,
					threshold: ctx.params.threshold,
					borderAbsolute: ctx.params.borderAbsolute ? 1 : 0,
					borderWidth: ctx.params.borderWidth,
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
