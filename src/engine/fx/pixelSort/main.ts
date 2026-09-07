import { defineEffect } from '@/engine/fx-utils';
import code from './shader.wgsl?raw';

export default defineEffect({
	name: 'pixelSort',
	displayName: 'Pixel sort',
	category: 'glitch',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		threshold: { type: 'range', label: 'Threshold', min: 0, max: 1, step: 0.001 },
		shadow: { type: 'bool', label: 'Shadow' },
		direction: { type: 'enum', label: 'Direction', options: [
			{ label: 'Horizontal', value: 'horizontal' },
			{ label: 'Vertical', value: 'vertical' },
		] },
		order: { type: 'enum', label: 'Order', options: [
			{ label: 'A > B', value: 'descending' },
			{ label: 'B > A', value: 'ascending' },
		] },
	},
	getDefaultParams: () => ({
		threshold: { type: 'literal', value: 0.5 },
		shadow: { type: 'literal', value: false },
		direction: { type: 'literal', value: 'horizontal' },
		order: { type: 'literal', value: 'descending' },
	}),
	getOut: ({ wgpu, resolution }) => wgpu.device.createTexture({
		size: resolution,
		format: navigator.gpu.getPreferredCanvasFormat(),
		usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
	}),
	init: ({ wgpu: { device, defaultVertexShaderModule }, resolution, params, fallbackTexture }) => {
		const module = device.createShaderModule({ code });
		const initialize = device.createComputePipeline({
			layout: 'auto', compute: { module, entryPoint: 'initialize' },
		});
		const merge = device.createComputePipeline({
			layout: 'auto', compute: { module, entryPoint: 'merge' },
		});
		const output = device.createRenderPipeline({
			layout: 'auto',
			vertex: { module: defaultVertexShaderModule },
			fragment: { module, entryPoint: 'fs', targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }] },
			primitive: { topology: 'triangle-list' },
		});
		const maxPasses = Math.ceil(Math.log2(Math.max(resolution.width, resolution.height)));
		const uniformSize = 36;
		const alignment = device.limits.minUniformBufferOffsetAlignment;
		const stride = Math.ceil(uniformSize / alignment) * alignment;
		const values = new ArrayBuffer(stride * (maxPasses + 1));
		const integers = new Uint32Array(values);
		const floats = new Float32Array(values);
		const uniforms = device.createBuffer({ size: values.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
		// Only keys and source indices move during sorting; RGBA stays in the source texture.
		const buffers = [0, 1].map(() => device.createBuffer({
			size: resolution.width * resolution.height * 12,
			usage: GPUBufferUsage.STORAGE,
		}));
		const uniformEntry = (pass: number) => ({ binding: 0, resource: { buffer: uniforms, offset: pass * stride, size: uniformSize } });
		const mergeGroups = Array.from({ length: maxPasses }, (_, pass) => device.createBindGroup({
			layout: merge.getBindGroupLayout(0),
			entries: [uniformEntry(pass + 1),
				{ binding: 2, resource: { buffer: buffers[pass % 2] } },
				{ binding: 3, resource: { buffer: buffers[1 - pass % 2] } },
			],
		}));
		let input = params.input;
		let initializeGroup: GPUBindGroup;
		let outputGroups: GPUBindGroup[];
		const updateInput = () => {
			const view = (input ?? fallbackTexture).createView();
			initializeGroup = device.createBindGroup({
				layout: initialize.getBindGroupLayout(0),
				entries: [uniformEntry(0), { binding: 1, resource: view }, { binding: 3, resource: { buffer: buffers[0] } }],
			});
			outputGroups = buffers.map(buffer => device.createBindGroup({
				layout: output.getBindGroupLayout(0),
				entries: [uniformEntry(0), { binding: 1, resource: view }, { binding: 2, resource: { buffer } }],
			}));
		};
		updateInput();
		return {
			render: ctx => {
				if (input !== ctx.params.input) {
					input = ctx.params.input;
					updateInput();
				}
				const vertical = ctx.params.direction === 'vertical';
				const length = vertical ? resolution.height : resolution.width;
				const lines = vertical ? resolution.width : resolution.height;
				const passes = Math.ceil(Math.log2(length));
				for (let pass = 0; pass <= passes; pass++) {
					const offset = pass * stride / 4;
					integers.set([resolution.width, resolution.height, length, lines, Number(vertical), Number(ctx.params.order === 'descending'), 2 ** Math.max(0, pass - 1)], offset);
					floats[offset + 7] = Math.min(1, Math.max(0, ctx.params.shadow ? ctx.params.threshold : 1 - ctx.params.threshold));
					integers[offset + 8] = ctx.params.shadow ? 1 : 0;
				}
				// Separate uniform slices keep every dispatch's merge width intact until submission.
				device.queue.writeBuffer(uniforms, 0, values, 0, stride * (passes + 1));
				const compute = ctx.commandEncoder.beginComputePass();
				compute.setPipeline(initialize);
				compute.setBindGroup(0, initializeGroup);
				compute.dispatchWorkgroups(Math.ceil(lines / 64));
				compute.setPipeline(merge);
				for (let pass = 0; pass < passes; pass++) {
					compute.setBindGroup(0, mergeGroups[pass]);
					compute.dispatchWorkgroups(Math.ceil(length / 64), lines);
				}
				compute.end();
				const render = ctx.createPassEncoder(ctx.commandEncoder);
				render.setPipeline(output);
				render.setBindGroup(0, outputGroups[passes % 2]);
				render.draw(6);
				render.end();
			},
			dispose: () => {
				uniforms.destroy();
				for (const buffer of buffers) buffer.destroy();
			},
		};
	},
});
