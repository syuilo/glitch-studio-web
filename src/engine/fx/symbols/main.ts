import { createTextureFromImages, makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import code from './shader.wgsl?raw';
import { defineEffect } from '@/engine/fx-utils';

function getSymbolTextureUrls(type: string) {
	return type === 'symbols_numbers' ? [
		'./assets/symbols/dot.png',
		'./assets/symbols/dot.png',
		'./assets/symbols/dot.png',
		'./assets/symbols/dots.png',
		'./assets/symbols/dots3.png',

		'./assets/symbols/o1.png',
		'./assets/symbols/o2.png',
		'./assets/symbols/o3.png',
		'./assets/symbols/o4.png',
		'./assets/symbols/x1.png',
		'./assets/symbols/x2.png',
		'./assets/symbols/cross1.png',
		'./assets/symbols/cross2.png',
		'./assets/symbols/slash1.png',
		'./assets/symbols/slash2.png',
		'./assets/symbols/corner.png',
		'./assets/symbols/circle-slash.png',
		'./assets/symbols/square-slash.png',

		'./assets/chars/0.png',
		'./assets/chars/1.png',
		'./assets/chars/2.png',
		'./assets/chars/3.png',
		'./assets/chars/4.png',
		'./assets/chars/5.png',
		'./assets/chars/6.png',
		'./assets/chars/7.png',
		'./assets/chars/8.png',
		'./assets/chars/9.png',

		'./assets/symbols/block.png',
	] : type === 'symbols' ? [
		'./assets/symbols/dot.png',
		'./assets/symbols/dot.png',
		'./assets/symbols/dot.png',
		'./assets/symbols/dots.png',
		'./assets/symbols/dots3.png',

		'./assets/symbols/o1.png',
		'./assets/symbols/o2.png',
		'./assets/symbols/o3.png',
		'./assets/symbols/o4.png',
		'./assets/symbols/x1.png',
		'./assets/symbols/x2.png',
		'./assets/symbols/cross1.png',
		'./assets/symbols/cross2.png',
		'./assets/symbols/slash1.png',
		'./assets/symbols/slash2.png',
		'./assets/symbols/corner.png',
		'./assets/symbols/circle-slash.png',
		'./assets/symbols/square-slash.png',

		'./assets/symbols/block.png',
	] : type === 'numbers' ? [
		'./assets/chars/0.png',
		'./assets/chars/1.png',
		'./assets/chars/2.png',
		'./assets/chars/3.png',
		'./assets/chars/4.png',
		'./assets/chars/5.png',
		'./assets/chars/6.png',
		'./assets/chars/7.png',
		'./assets/chars/8.png',
		'./assets/chars/9.png',
	] : type === 'sweets' ? [
		'./assets/emojis/candy_3d.png',
		'./assets/emojis/chocolate_bar_3d.png',
		'./assets/emojis/cookie_3d.png',
		'./assets/emojis/dango_3d.png',
		'./assets/emojis/doughnut_3d.png',
		'./assets/emojis/ice_cream_3d.png',
		'./assets/emojis/lollipop_3d.png',
		'./assets/emojis/pancakes_3d.png',
		'./assets/emojis/shortcake_3d.png',
		'./assets/emojis/soft_ice_cream_3d.png',
	] : [];
}

export default defineEffect({
	name: 'symbols',
	displayName: 'Symbols',
	category: 'effect',
	disableCache: true, // テクスチャの非同期読み込みに対応するためとりあえず無効化 そのうち良い感じにする
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		iconset: { type: 'enum', label: 'Iconset', options: [{
			value: 'symbols_numbers', label: 'Symbols + Numbers',
		}, {
			value: 'symbols', label: 'Symbols',
		}, {
			value: 'numbers', label: 'Numbers',
		}, {
			value: 'sweets', label: 'Sweets',
		}] },
		highlightClipThreshold: { type: 'range', label: 'Highlight Clip Threshold', min: 0, max: 1, step: 0.01 },
		shadowClipThreshold: { type: 'range', label: 'Shadow Clip Threshold', min: 0, max: 1, step: 0.01 },
		divisions: { type: 'range', min: 8, max: 512, step: 1, label: 'Cell Divisions' },
		margin: { type: 'range', min: 0, max: 1, step: 0.01, label: 'Cell Margin' },
		symbolTexturesRangeMin: { type: 'range', min: 0, max: 1, step: 0.01, label: 'Symbol Textures Range Min' },
		symbolTexturesRangeMax: { type: 'range', min: 0, max: 1, step: 0.01, label: 'Symbol Textures Range Max' },
		bgColor: { type: 'color', label: 'Background Color' },
		colorA: { type: 'color', label: 'Color A' },
		colorB: { type: 'color', label: 'Color B' },
		colorC: { type: 'color', label: 'Color C' },
		similarityThresholdFactor: { type: 'range', min: 0, max: 32, step: 0.1, label: 'Similarity Threshold Factor' },
		forceField: { type: 'node', label: 'Force Field' },
		forceFieldShift: { type: 'bool', label: 'Force Field Shift' },
		forceFieldWarp: { type: 'bool', label: 'Force Field Warp' },
	},
	getDefaultParams: () => ({
		iconset: { type: 'literal', value: 'symbols' },
		highlightClipThreshold: { type: 'literal', value: 0.8 },
		shadowClipThreshold: { type: 'literal', value: 0.2 },
		divisions: { type: 'literal', value: 64 },
		margin: { type: 'literal', value: 0.25 },
		symbolTexturesRangeMin: { type: 'literal', value: 0 },
		symbolTexturesRangeMax: { type: 'literal', value: 1 },
		bgColor: { type: 'literal', value: [0, 0, 0] },
		colorA: { type: 'literal', value: [1, 1, 1] },
		colorB: { type: 'literal', value: [0.8, 1, 0] },
		colorC: { type: 'literal', value: [1, 0.3, 0] },
		similarityThresholdFactor: { type: 'literal', value: 2 },
		forceField: { type: 'literal', value: null },
		forceFieldShift: { type: 'literal', value: true },
		forceFieldWarp: { type: 'literal', value: true },
	}),
	getOut: ({ wgpu, resolution }) => {
		const out = wgpu.device.createTexture({
			size: resolution,
			format: navigator.gpu.getPreferredCanvasFormat(),
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
		});
		return out;
	},
	init: ({ wgpu, params, fallbackTexture, resolution }) => {
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
			addressModeU: 'mirror-repeat',
			addressModeV: 'mirror-repeat',
		});

		let symbolTexture: GPUTexture | null = null;

		let inputTexture: GPUTexture | null = null;
		let forceFieldTexture: GPUTexture | null = null;
		let bindGroup: GPUBindGroup;
		const updateBindGroup = (newInputTexture: GPUTexture | null, newForceFieldTexture: GPUTexture | null) => {
			inputTexture = newInputTexture;
			forceFieldTexture = newForceFieldTexture;
			bindGroup = wgpu.device.createBindGroup({
				layout: pipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 1, resource: { buffer: uniformBuffer } },
					{ binding: 2, resource: sampler },
					{ binding: 3, resource: (inputTexture ?? fallbackTexture).createView() },
					{ binding: 4, resource: (symbolTexture ?? fallbackTexture).createView() },
					{ binding: 5, resource: (forceFieldTexture ?? fallbackTexture).createView() },
				],
			});
		};
		updateBindGroup(params.input, params.forceField);

		let iconset = params.iconset;
		let symbolTextureCount = 0;
		const symbolTexturesPromise = createTextureFromImages(wgpu.device, getSymbolTextureUrls(params.iconset), {
			mips: true,
		}).then(texture => {
			symbolTexture = texture;
			symbolTextureCount = getSymbolTextureUrls(params.iconset).length;
			updateBindGroup(params.input, params.forceField);
		});

		return {
			render: (ctx) => {
				if (ctx.params.input !== inputTexture || ctx.params.forceField !== forceFieldTexture) {
					updateBindGroup(ctx.params.input, ctx.params.forceField);
				}
				if (ctx.params.iconset !== iconset) {
					iconset = ctx.params.iconset;
					createTextureFromImages(wgpu.device, getSymbolTextureUrls(iconset), {
						mips: true,
					}).then(texture => {
						symbolTexture = texture;
						symbolTextureCount = getSymbolTextureUrls(iconset).length;
						updateBindGroup(ctx.params.input, ctx.params.forceField);
					});
				}

				uniformValues.set({
					aspectRatio: resolution.width / resolution.height,
					sourceAspectRatio: resolution.width / resolution.height,
					coverSource: 1,
					sourceContrast: 1,
					highlightClipThreshold: ctx.params.highlightClipThreshold,
					shadowClipThreshold: ctx.params.shadowClipThreshold,
					divisions: ctx.params.divisions,
					margin: ctx.params.margin,
					symbolTexturesCount: symbolTextureCount,
					symbolTexturesRangeMin: ctx.params.symbolTexturesRangeMin,
					symbolTexturesRangeMax: ctx.params.symbolTexturesRangeMax,
					useOriginalColor: ctx.params.iconset === 'sweets' ? 1 : 0,
					enableClippedAreaFill: ctx.params.iconset === 'sweets' ? 0 : 1,
					bgColor: ctx.params.bgColor,
					colorA: ctx.params.colorA,
					colorB: ctx.params.colorB,
					colorC: ctx.params.colorC,
					similarityThresholdFactor: ctx.params.similarityThresholdFactor,
					forceFieldShift: ctx.params.forceFieldShift ? 1 : 0,
					forceFieldWarp: ctx.params.forceFieldWarp ? 1 : 0,
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
				symbolTexture?.destroy();
			},
		};
	},
});
