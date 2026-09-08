import seedrandom from 'seedrandom';
import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import code from './shader.wgsl?raw';
import { defineEffect } from '@/engine/fx-utils';

const maxTearings = 128;

export default defineEffect({
	name: 'tearings',
	displayName: 'Tearings',
	category: 'glitch',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		amount: { type: 'range', min: 0, max: 100, label: 'Amount' },
		strength: { type: 'range', min: -1, max: 1, step: 0.01, label: 'Strength' },
		size: { type: 'range', min: 0, max: 100, step: 0.01, label: 'Size' },
		angle: { type: 'range', min: -180, max: 180, step: 0.01, label: 'Angle' },
		channelShift: { type: 'range', min: 0, max: 10, step: 0.01, label: 'Ch shift' },
		seed: { type: 'seed', label: 'Seed' },
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
		amount: { type: 'literal', value: 3 },
		strength: { type: 'literal', value: 0.02 },
		size: { type: 'literal', value: 20 },
		angle: { type: 'literal', value: 0 },
		channelShift: { type: 'literal', value: 0.5 },
		seed: { type: 'expression', value: 'TIME' },
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
				magFilter: 'nearest',
				minFilter: 'nearest',
				addressModeU: 'clamp-to-edge',
				addressModeV: 'clamp-to-edge',
			}),
			repeat: wgpu.device.createSampler({
				magFilter: 'nearest',
				minFilter: 'nearest',
				addressModeU: 'repeat',
				addressModeV: 'repeat',
			}),
			repeatMirrored: wgpu.device.createSampler({
				magFilter: 'nearest',
				minFilter: 'nearest',
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

		const shifts = new Float32Array(maxTearings * 4);

		return {
			render: (ctx) => {
				if (ctx.params.input !== inputTexture || ctx.params.wrap !== wrap) {
					inputTexture = ctx.params.input;
					wrap = ctx.params.wrap;
					updateBindGroup();
				}

				const amount = Math.min(maxTearings, Math.max(0, Math.trunc(ctx.params.amount)));
				const rnd = seedrandom(ctx.params.seed.toString());
				for (let i = 0; i < amount; i++) {
					const offset = i * 4;
					shifts[offset] = rnd();
					shifts[offset + 1] = (1 - rnd() * 2) * ctx.params.strength;
					shifts[offset + 2] = rnd() * (ctx.params.size / 100);
				}

				uniformValues.set({
					amount,
					angle: ctx.params.angle * Math.PI / 180,
					channelShift: ctx.params.channelShift,
					shifts,
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
