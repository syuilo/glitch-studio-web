import { Asset, FxParamValue, Macro } from "@/types.ts";
import { EffectInstance } from "./fx-utils.ts";
import defaultVertexShaderCode from './vertex.wgsl?raw';
import TimingHelper from './TimingHelper.ts';
import { fxs } from "./fxs.ts";
import { createTextureFromSource, makeShaderDataDefinitions, makeStructuredView } from "webgpu-utils";
import finalRenderShaderCode from './render.wgsl?raw';
import { NonNegativeRollingAverage } from "./NonNegativeRollingAverage.ts";
import { GsAutomation } from "./types.ts";
import { GpuHistogram } from "./GpuHistogram.ts";
import { GpuWaveform } from "./GpuWaveform.ts";
import { evalAutomationValue, genEmptyValue } from "@/utils.ts";
import { evaluate } from "mathjs";
import { deepClone } from "@/utility/deep-clone.ts";
import { isVideoFrameAvailable } from "@/utility/video.ts";

export type GsFxNode = {
	id: string;
	type: 'fx';
	fx: string;
	isEnabled: boolean;
	params: Record<string, FxParamValue>;
};

export type GsGroupNode = {
	id: string;
	type: 'group';
	isEnabled: boolean;
	name: string;
	nodes: GsNode[];
	macros: Macro[];
};

export type GsNode = GsFxNode | GsGroupNode;

export class Renderer {
	private gpuContext: GPUCanvasContext;
	private gpuDevice: GPUDevice;
	private resolution: { width: number; height: number; };
	private histogramCanvas: HTMLCanvasElement | null = null;
	private gpuHistogram: GpuHistogram | null = null;
	private waveformCanvas: HTMLCanvasElement | null = null;
	private gpuWaveform: GpuWaveform | null = null;
	private defaultVertexShaderModule: GPUShaderModule;
	private fallbackTexture: GPUTexture;
	private enableStats: boolean = true;
	private hasAlpha: boolean = false;
	private nodes: GsNode[];
	private assets: Asset[];
	private macros: Macro[];
	private automations: GsAutomation[];
	private assetTextures: Map<string, GPUTexture> = new Map();
	private videoElements: Map<GsFxNode['id'], HTMLVideoElement> = new Map();
	private effectInstances: Map<GsFxNode['id'], EffectInstance | null> = new Map();
	private effectOuts: Map<GsFxNode['id'], GPUTexture> = new Map();
	private timingHelper: TimingHelper;
	private finalRenderPipeline: GPURenderPipeline;
	private finalRenderUniformValues: ReturnType<typeof makeStructuredView>;
	private finalRenderUniformBuffer: GPUBuffer;
	private finalRenderBindGroup: GPUBindGroup | null = null;
	private finalRenderInputTexture: GPUTexture | null = null;
	private enableFloat32Filtering = false;
	private evaledNodeParams: Map<GsNode['id'], Record<string, any>> = new Map();
	public gpuAverageFast = new NonNegativeRollingAverage(10);
	public gpuAverageMedium = new NonNegativeRollingAverage(100);
	public gpuAverageSlow = new NonNegativeRollingAverage(1000);

	constructor(options: {
		gpuDevice: GPUDevice;
		gpuContext: GPUCanvasContext;
		resolution: {
			width: number;
			height: number;
		};
		enableFloat32Filtering: boolean;
		enableStats: boolean;
		histogramCanvas: HTMLCanvasElement | null;
		waveformCanvas: HTMLCanvasElement | null;
		nodes: GsNode[];
		assets: Asset[];
		macros: Macro[];
		automations: GsAutomation[];
	}) {
		this.resolution = options.resolution;
		this.enableStats = options.enableStats;
		this.enableFloat32Filtering = options.enableFloat32Filtering;
		this.gpuDevice = options.gpuDevice;
		this.gpuContext = options.gpuContext;
		this.nodes = options.nodes;
		this.assets = options.assets;
		this.macros = options.macros;
		this.automations = options.automations;
		this.histogramCanvas = options.histogramCanvas;
		this.initHistogram();
		this.waveformCanvas = options.waveformCanvas;
		this.initWaveform();

		this.timingHelper = new TimingHelper(this.gpuDevice);

		this.gpuContext.configure({
			device: this.gpuDevice,
			format: navigator.gpu.getPreferredCanvasFormat(),
			alphaMode: this.hasAlpha ? 'premultiplied' : 'opaque',
			colorSpace: 'display-p3',
			usage: GPUTextureUsage.RENDER_ATTACHMENT,
		});

		this.fallbackTexture = this.gpuDevice.createTexture({
			size: [1, 1],
			format: navigator.gpu.getPreferredCanvasFormat(),
			usage: GPUTextureUsage.TEXTURE_BINDING,
		});

		this.defaultVertexShaderModule = this.gpuDevice.createShaderModule({
			code: defaultVertexShaderCode,
		});

		const finalRenderShaderModule = this.gpuDevice.createShaderModule({
			code: finalRenderShaderCode,
		});

		const finalRenderShaderDataDefinitions = makeShaderDataDefinitions(finalRenderShaderCode);

		this.finalRenderPipeline = this.gpuDevice.createRenderPipeline({
			vertex: {
				module: this.defaultVertexShaderModule,
			},
			fragment: {
				module: finalRenderShaderModule,
				targets: [{
					format: navigator.gpu.getPreferredCanvasFormat(),
				}],
			},
			primitive: {
				topology: 'triangle-list',
			},
			layout: 'auto',
		});

		this.finalRenderUniformValues = makeStructuredView(finalRenderShaderDataDefinitions.uniforms.uniforms);

		this.finalRenderUniformBuffer = this.gpuDevice.createBuffer({
			size: this.finalRenderUniformValues.arrayBuffer.byteLength,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
	}

	public findNode(nodeId: string, nodes: GsNode[] = this.nodes): GsNode | undefined {
		const search = (nodes: GsNode[]) => {
			for (const node of nodes) {
				if (node.id === nodeId) {
					return node;
				}
				if (node.type === 'group') {
					const found = search(node.nodes);
					if (found) {
						return found;
					}
				}
			}
		};
		return search(nodes);
	}

	private evalNodeParams(nodes: GsNode[], provideVars: Record<string, any> = {}) {
		const scope = {
			WIDTH: this.resolution.width,
			HEIGHT: this.resolution.height,
			TIME: this.time,
			FRAME: this.frame,
			MOUSE_X: this.mouseX,
			MOUSE_Y: this.mouseY,
			...provideVars,
		};

		// Mixin (global) macros
		// TODO: automation support
		const macroScope = {} as Record<string, any>;
		for (const macro of this.macros) {
			macroScope[macro.name] =
				macro.value.type === 'literal'
					? macro.value.value
					: macro.value.value
						? evaluate(macro.value.value, scope)
						: genEmptyValue(macro);
	
			if (macro.type === 'image') {
				macroScope[macro.name] = serializeAsset(
					this.assets.find(a => a.id === macroScope[macro.name]));
			}
		}

		// Mixin (global) automations
		// TODO: 各automationをフレーム数を引数にとる関数として定義する
		const automationScope = {} as Record<string, any>;
		for (const automation of this.automations) {
			automationScope[automation.name] = evalAutomationValue(automation, this.frame);
		}
		
		for (const node of nodes.filter((n): n is GsFxNode => n.type === 'fx')) {
			const params = node.params;
			const paramDefs = fxs[node.fx].paramDefs;
		
			// Bake all params
			const defaults = {} as GsFxNode['params'];
		
			for (const [k, v] of Object.entries(paramDefs)) {
				defaults[k] = v.default;
			}
		
			const mergedParams = { ...defaults, ...params } as GsFxNode['params'];
		
			const evaluatedParams = {} as Record<string, any>;
		
			const mixedScope = {
				...macroScope,
				...automationScope,
				...scope,
			};
		
			for (const [k, v] of Object.entries(mergedParams)) {
				evaluatedParams[k] =
					v.type === 'literal'
						? v.value
						: v.type === 'expression' && v.value
								? evaluate(v.value, mixedScope)
								: v.type === 'automation' && v.value
									? evalAutomationValue(this.automations.find(a => a.id === v.value), this.frame)
									: genEmptyValue(paramDefs[k]);
				}
		
			this.evaledNodeParams.set(node.id, evaluatedParams);
		}

		for (const node of nodes.filter((n): n is GsGroupNode => n.type === 'group')) {
			const groupMacroValues = {} as Record<string, any>;
			// TODO: automation support
			for (const macro of node.macros) {
				groupMacroValues[macro.name] =
					macro.value.type === 'literal'
						? macro.value.value
						: macro.value.value
							? evaluate(macro.value.value, scope)
							: genEmptyValue(macro);
		
				if (macro.type === 'image') {
					groupMacroValues[macro.name] = serializeAsset(
						this.assets.find(a => a.id === groupMacroValues[macro.name]));
				}
			}
			
			this.evalNodeParams(node.nodes, groupMacroValues);
		}
	}

	private evalCacheKey(node: GsNode, visited: GsNode['id'][] = []): string {
		if (visited.includes(node.id)) {
			throw new Error('circular dependency detected');
		}

		const key = {
			_isEnabled: node.isEnabled,
		};

		if (node.type === 'group') {
			key.nodes = [];
			for (const n of node.nodes) {
				key.nodes.push(this.evalCacheKey(n, [...visited, node.id]));
			}

			// TODO: macro
		} else {
			// 動画ノードはキャッシュさせない
			if (fxs[node.fx].name === 'webcamera') {
				return Math.random().toString();
			}

			const paramDefs = fxs[node.fx].paramDefs;

			for (const [k, v] of Object.entries(this.evaledNodeParams.get(node.id))) {
				key[k] = v;

				if (paramDefs[k].type === 'node') {
					if (v) {
						const targetNode = this.findNode(v);
						if (targetNode) {
							key[k] = this.evalCacheKey(targetNode, [...visited, node.id]);
						}
					}
				} else if (paramDefs[k].type === 'nodes') {
					key[k] = [];
					for (const n of v) {
						const targetNode = this.findNode(n);
						if (targetNode) {
							key[k].push(this.evalCacheKey(targetNode, [...visited, node.id]));
						}
					}
				}
			}
		}

		return JSON.stringify(key);
	}

	private async renderNode(node: GsNode, commandEncoder: GPUCommandEncoder, visited: GsNode['id'][]): Promise<void> {
		if (visited.includes(node.id)) {
			throw new Error('circular dependency detected');
		}

		if (node.type === 'group') {
			if (node.nodes.length === 0) {
				return;
			}
			return this.renderNode(node.nodes.at(-1), commandEncoder, [...visited, node.id]);
		}

		const key = this.evalCacheKey(node);

		const effect = fxs[node.fx];

		const params = this.evaledNodeParams.get(node.id)!;

		for (const [k, _] of Object.entries(effect.paramDefs).filter(([k, v]) => v.type === 'node')) {
			const v = params[k];
			if (v == null) {
				continue;
			}
			const targetNode = this.findNode(v);
			if (targetNode) {
				this.renderNode(targetNode, commandEncoder, [...visited, node.id]);
			}
		}
		//for (const [k, _] of Object.entries(fx.paramDefs).filter(([k, v]) => v.type === 'nodes')) {
		//	inputNodeTexs[k] = [];
		//	for (const v of params[k]) {
		//		const targetNode = this.findNode(v);
		//		if (targetNode) {
		//			inputNodeTexs[k].push(this.renderNode(targetNode, [...visited, node.id]));
		//		} else {
		//			inputNodeTexs[k].push(this.placeholderTexture);
		//		}
		//	}
		//}

		const paramsWithOuts = Object.fromEntries(Object.entries(params).map(([k, v]) =>
			[k,
				effect.paramDefs[k].type === 'node' ? this.effectOuts.get(params[k])! :
				effect.paramDefs[k].type === 'image' ? this.assetTextures.get(params[k])! :
				effect.paramDefs[k].type === 'video' ? this.videoElements.get(node.id)! :
				v]));

		let effectInstance = this.effectInstances.get(node.id);
		if (effectInstance == null) {
			effectInstance = effect.init({
				resolution: { width: this.resolution.width, height: this.resolution.height },
				wgpu: { device: this.gpuDevice, context: this.gpuContext, defaultVertexShaderModule: this.defaultVertexShaderModule, enableFloat32Filtering: this.enableFloat32Filtering },
				params: paramsWithOuts,
				fallbackTexture: this.fallbackTexture,
			});
			this.effectInstances.set(node.id, effectInstance);
		}

		effectInstance.render({
			time: performance.now() / 1000,
			timeDelta: 0,
			params: paramsWithOuts,
			commandEncoder: commandEncoder,
			createPassEncoder: (commandEncoder, descriptor) => {
				const _descriptor = descriptor ?? {
					colorAttachments: [{
						view: this.effectOuts.get(node.id)!.createView(), // TODO: cache view
						clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
						loadOp: 'clear',
						storeOp: 'store',
					}],
				} satisfies GPURenderPassDescriptor;
				return this.enableStats ? this.timingHelper.beginRenderPass(commandEncoder, _descriptor) : commandEncoder.beginRenderPass(_descriptor);
			},
		});
	}

	public render(renderNodeId: string, args: {
		mouseX?: number;
		mouseY?: number;
		frame?: number;
	}) {
		const node = this.findNode(renderNodeId);
		if (node == null) return;

		this.evalNodeParams(this.nodes);

		const commandEncoder = this.gpuDevice.createCommandEncoder();

		this.renderNode(node, commandEncoder, []);

		//#region nodeのoutをcanvasに描画
		if (this.finalRenderBindGroup == null || this.finalRenderInputTexture != this.effectOuts.get(node.id)) {
			this.finalRenderInputTexture = this.effectOuts.get(node.id)!;
			this.finalRenderBindGroup = this.gpuDevice.createBindGroup({
				layout: this.finalRenderPipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 1, resource: { buffer: this.finalRenderUniformBuffer }},
					{ binding: 2, resource: this.finalRenderInputTexture.createView() }, // TODO: cache view
				],
			});
		}

		this.finalRenderUniformValues.set({
			test: 1,
		});
		this.gpuDevice.queue.writeBuffer(this.finalRenderUniformBuffer, 0, this.finalRenderUniformValues.arrayBuffer);

		const passEncoder = commandEncoder.beginRenderPass({
			colorAttachments: [{
				view: this.gpuContext.getCurrentTexture().createView(),
				clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
				loadOp: 'clear',
				storeOp: 'store',
			}],
		});
		passEncoder.setPipeline(this.finalRenderPipeline);
		passEncoder.setBindGroup(0, this.finalRenderBindGroup);
		passEncoder.draw(6);
		passEncoder.end();

		this.gpuHistogram?.render(commandEncoder, this.finalRenderInputTexture);
		this.gpuWaveform?.render(commandEncoder, this.finalRenderInputTexture);

		this.gpuDevice.queue.submit([commandEncoder.finish()]);
		//#endregion

		if (this.enableStats) {
			this.timingHelper.getResult().then(gpuTime => {
				this.gpuAverageFast.addSample(gpuTime / 1000);
				this.gpuAverageMedium.addSample(gpuTime / 1000);
				this.gpuAverageSlow.addSample(gpuTime / 1000);
			});
		}
	}

	public updateNodes(newNodes: GsNode[], videoElements: Map<GsFxNode['id'], HTMLVideoElement>) {
		const addedNodes = newNodes.filter(n => !this.nodes.some(existing => existing.id === n.id));
		const removedNodes = this.nodes.filter(n => !newNodes.some(existing => existing.id === n.id));

		for (const node of addedNodes) {
			if (node.type === 'fx') {
				const effect = fxs[node.fx]; 
				const out = effect.getOut({
					wgpu: { device: this.gpuDevice, enableFloat32Filtering: this.enableFloat32Filtering },
					resolution: { width: this.resolution.width, height: this.resolution.height }
				});
				this.effectOuts.set(node.id, out);
			}
		}

		for (const node of removedNodes) {
			if (node.type === 'fx') {
				const out = this.effectOuts.get(node.id);
				if (out) {
					out.destroy();
					this.effectOuts.delete(node.id);
				}
			}
		}

		this.nodes = deepClone(newNodes);
		this.videoElements = videoElements;
	}

	public updateAssets(newAssets: Asset[]) {
		this.assets = deepClone(newAssets);
		this.bakeAssets();
	}

	public updateMacros(newMacros: Macro[]) {
		this.macros = deepClone(newMacros);
	}

	public updateAutomations(newAutomations: GsAutomation[]) {
		this.automations = deepClone(newAutomations);
	}

	public async bakeAssets() {
		for (const [k, v] of this.assetTextures.entries()) {
			v.destroy();
			this.assetTextures.delete(k);
		}

		for (const asset of this.assets) {
			console.log(asset);
			if (asset.fileDataType.startsWith('image/')) {
				const tex = createTextureFromSource(this.gpuDevice, {
					data: asset.data,
					width: asset.width,
					height: asset.height,
				});
				this.assetTextures.set(asset.id, tex);
			}

			/*
			// gif
			const gif = GIF.parseGIF(asset.buffer);
			const frames = GIF.decompressFrames(gif, true);
			const canvas = document.createElement('canvas');
			const gifCanvas = document.createElement('canvas');
			const tempCanvas = document.createElement('canvas');
			document.body.appendChild(canvas);
			this.gifs.set(asset.id, {
				gif,
				frames,
				canvas,
				canvasCtx: canvas.getContext('2d')!,
				gifCanvas,
				gifCanvasCtx: gifCanvas.getContext('2d')!,
				tempCanvas,
				tempCanvasCtx: tempCanvas.getContext('2d')!,
			});
			*/
		}

		//this.clearNodeCache();
	}

	public setHistogramCanvas(canvas: HTMLCanvasElement | null) {
		this.gpuHistogram?.dispose();
		this.gpuHistogram = null;
		this.histogramCanvas = canvas;
		this.initHistogram();
	}

	private initHistogram() {
		if (!this.gpuDevice || !this.histogramCanvas) return;
		this.gpuHistogram?.dispose();
		this.gpuHistogram = new GpuHistogram(
			this.gpuDevice,
			this.histogramCanvas,
			navigator.gpu.getPreferredCanvasFormat(),
		);
	}

	public setWaveformCanvas(canvas: HTMLCanvasElement | null) {
		this.gpuWaveform?.dispose();
		this.gpuWaveform = null;
		this.waveformCanvas = canvas;
		this.initWaveform();
	}

	private initWaveform() {
		if (!this.gpuDevice || !this.waveformCanvas) return;
		this.gpuWaveform?.dispose();
		this.gpuWaveform = new GpuWaveform(
			this.gpuDevice,
			this.waveformCanvas,
			navigator.gpu.getPreferredCanvasFormat(),
		);
	}

	public destroy() {
		this.gpuHistogram?.dispose();
		this.gpuHistogram = null;
		this.gpuWaveform?.dispose();
		this.gpuWaveform = null;

		for (const instance of this.effectInstances.values()) {
			instance.dispose();
		}
		this.effectInstances.clear();

		for (const out of this.effectOuts.values()) {
			out.destroy();
		}
		this.effectOuts.clear();

		this.gpuDevice?.destroy();
	}
}
