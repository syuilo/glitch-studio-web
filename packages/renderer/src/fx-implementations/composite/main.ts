import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import { implementEffect } from '../../fx-implementation.ts';
import code from './shader.wgsl?raw';
import type { blend as definition } from '@glitch/shared/fx-definitions/composite.ts';

const fitModes = { stretch: 0, cover: 1, contain: 2 };
const blendModes = ['normal', 'add', 'subtract', 'multiply', 'min', 'max', 'screen', 'overlay', 'difference', 'exclusion'];

// 四つのエフェクトでリソース管理を共有し、色の合成とデータ演算の意味・精度は分離する。
function createComposite(data: boolean, interpolate: boolean) {
	const format: GPUTextureFormat = data ? 'rgba32float' : 'rgba16float';
	return implementEffect<typeof definition>({
		getOut: ({ wgpu, resolution }) => wgpu.device.createTexture({
			size: resolution, format, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
		}),
		init: ({ wgpu, resolution, fallbackTexture }) => {
			const device = wgpu.device;
			const values = makeStructuredView(makeShaderDataDefinitions(code).uniforms.uniforms);
			const buffer = device.createBuffer({ size: values.arrayBuffer.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
			// float32-filterableの有無にかかわらず32bit入力を受け入れる。補間はtextureLoadで行う。
			const layout = device.createBindGroupLayout({ entries: [
				{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
				...[1, 2, 3].map(binding => ({ binding, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float' as const } })),
			] });
			const pipeline = device.createRenderPipeline({
				layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
				vertex: { module: wgpu.defaultVertexShaderModule },
				fragment: { module: device.createShaderModule({ code }), targets: [{ format }] },
				primitive: { topology: 'triangle-list' },
			});
			let textures: GPUTexture[] = [];
			let bindGroup: GPUBindGroup;
			return {
				render: ctx => {
					const p = ctx.params;
					const inputs = [p.inputA ?? fallbackTexture, p.inputB ?? fallbackTexture, p.amount];
					if (inputs.some((texture, i) => texture !== textures[i])) {
						textures = inputs;
						bindGroup = device.createBindGroup({ layout, entries: [
							{ binding: 0, resource: { buffer } },
							...textures.map((texture, i) => ({ binding: i + 1, resource: texture.createView() })),
						] });
					}
					values.set({
						aspectRatio: resolution.width / resolution.height,
						fitA: fitModes[p.fitModeA], fitB: fitModes[p.fitModeB], fitAmount: fitModes[p.fitModeAmount],
						blendMode: Math.max(0, blendModes.indexOf(p.blendMode)),
						data: Number(data), interpolate: Number(interpolate),
					});
					device.queue.writeBuffer(buffer, 0, values.arrayBuffer);
					const pass = ctx.createPassEncoder(ctx.commandEncoder);
					pass.setPipeline(pipeline);
					pass.setBindGroup(0, bindGroup);
					pass.draw(6);
					pass.end();
				},
				dispose: () => buffer.destroy(),
			};
		},
	});
}

export const blend = createComposite(false, false);
export const mix = createComposite(false, true);
export const dataBlend = createComposite(true, false);
export const dataMix = createComposite(true, true);
