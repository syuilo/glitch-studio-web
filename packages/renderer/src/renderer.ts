import { createTextureFromSource, makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import * as AiScript from '@syuilo/aiscript';
import { deepClone } from '@glitch/shared/utility/deep-clone.ts';
import { evalAutomationValue, genEmptyValue } from '@glitch/shared/utility/misc.ts';
import defaultVertexShaderCode from './vertex.wgsl?raw';
import TimingHelper from './TimingHelper.ts';
import { fxs } from './fxs.ts';
import finalRenderShaderCode from './render.wgsl?raw';
import { NonNegativeRollingAverage } from './NonNegativeRollingAverage.ts';
import { GpuHistogram } from './GpuHistogram.ts';
import { GpuWaveform } from './GpuWaveform.ts';
import type { Asset, FxParamValue, Macro, GsAutomation } from '@glitch/shared/types.ts';
import type { EffectInstance } from './fx-utils.ts';

const aisParser = new AiScript.Parser();

const aiscript = new AiScript.Interpreter({});

// TODO: 毎回parseしているのが無駄感あるからどうにかする
function evaluateExpression(expression: string, scope: Record<string, any>): any {
	for (const key in scope) {
		if (aiscript.scope.exists(key)) {
			aiscript.scope.assign(key, AiScript.utils.jsToVal(scope[key]));
		} else {
			aiscript.scope.add(key, { isMutable: true, value: AiScript.utils.jsToVal(scope[key]) });
		}
	}
	const aisVal = aiscript.execSync(aisParser.parse(expression));
	if (aisVal === undefined) return null;
	return AiScript.utils.valToJs(aisVal);
}

function serializeAsset(asset: Asset | undefined) {
	if (asset == null) return null;
	return {
		id: asset.id,
		width: asset.width,
		height: asset.height,
		data: asset.data,
		hash: asset.hash,
	};
}

export type GsFxNode = {
	id: string;
	type: 'fx';
	fx: string;
	isEnabled: boolean;
	params: Record<string, FxParamValue>;

	// 2D平面上でノードを配置できるようになった時のため
	pos?: { x: number; y: number };
};

export type GsGroupNode = {
	id: string;
	type: 'group';
	isEnabled: boolean;
	name: string;
	nodes: GsNode[];
	macros: Macro[];

	// 2D平面上でノードを配置できるようになった時のため
	pos?: { x: number; y: number };
};

export type GsNode = GsFxNode | GsGroupNode;

function getFxNodes(nodes: GsNode[]): GsFxNode[] {
	return nodes.flatMap(node => node.type === 'group' ? getFxNodes(node.nodes) : [node]);
}

function getActualOutputNodeId(node: GsNode): string | undefined {
	return node.type === 'group' ? node.nodes.at(-1)?.id : node.id;
}

export class Renderer {
	private gpuContext: GPUCanvasContext;
	private gpuDevice: GPUDevice;
	private resolution: { width: number; height: number; };
	private defaultVertexShaderModule: GPUShaderModule;
	private fallbackTexture: GPUTexture;
	private enableStats = true;
	private nodes: GsNode[] = [];
	private assets: Asset[] = [];
	private macros: Macro[] = [];
	private automations: GsAutomation[] = [];
	private assetTextures: Map<string, GPUTexture> = new Map();
	private videoFrames: Map<GsFxNode['id'], VideoFrame> = new Map();
	private effectInstances: Map<GsFxNode['id'], EffectInstance | null> = new Map();
	private effectOuts: Map<GsFxNode['id'], GPUTexture> = new Map();
	private effectCacheKeys: Map<GsFxNode['id'], string> = new Map();
	private timingHelper: TimingHelper;
	private finalRenderPipeline: GPURenderPipeline;
	private finalRenderUniformValues: ReturnType<typeof makeStructuredView>;
	private finalRenderUniformBuffer: GPUBuffer;
	private finalRenderBindGroup: GPUBindGroup | null = null;
	private finalRenderInputTexture: GPUTexture | null = null;
	private enableFloat32Filtering = false;
	private evaledNodeParams: Map<GsNode['id'], Record<string, any>> = new Map();
	private latestTimestamp: number = performance.now();
	private histogramGpuContext: GPUCanvasContext;
	private waveformGpuContext: GPUCanvasContext;
	private gpuHistogram: GpuHistogram;
	private gpuWaveform: GpuWaveform;
	public gpuAverageFast = new NonNegativeRollingAverage(10);
	public gpuAverageMedium = new NonNegativeRollingAverage(100);
	public gpuAverageSlow = new NonNegativeRollingAverage(1000);
	public fpsAverage = new NonNegativeRollingAverage(30);
	private frame = 0; // TODO

	constructor(options: {
		gpuDevice: GPUDevice;
		gpuContext: GPUCanvasContext;
		resolution: {
			width: number;
			height: number;
		};
		enableFloat32Filtering: boolean;
		enableStats: boolean;
		assets: Asset[];
		macros: Macro[];
		automations: GsAutomation[];
		nodes: GsNode[];
		histogramGpuContext: GPUCanvasContext;
		waveformGpuContext: GPUCanvasContext;
	}) {
		this.resolution = options.resolution;
		this.enableStats = options.enableStats;
		this.enableFloat32Filtering = options.enableFloat32Filtering;
		this.gpuDevice = options.gpuDevice;
		this.gpuContext = options.gpuContext;
		this.histogramGpuContext = options.histogramGpuContext;
		this.gpuHistogram = new GpuHistogram(
			this.gpuDevice,
			this.histogramGpuContext,
			navigator.gpu.getPreferredCanvasFormat(),
		);
		this.waveformGpuContext = options.waveformGpuContext;
		this.gpuWaveform = new GpuWaveform(
			this.gpuDevice,
			this.waveformGpuContext,
			navigator.gpu.getPreferredCanvasFormat(),
		);

		this.timingHelper = new TimingHelper(this.gpuDevice);

		this.gpuContext.configure({
			device: this.gpuDevice,
			format: navigator.gpu.getPreferredCanvasFormat(),
			alphaMode: 'premultiplied',
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

		this.updateAssets(options.assets);
		this.updateMacros(options.macros);
		this.updateAutomations(options.automations);
		this.updateNodes(options.nodes);
	}

	public findNode(nodeId: string, nodes: GsNode[] = this.nodes): GsNode | undefined {
		const search = (nodes: GsNode[]): GsNode | undefined => {
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
						? evaluateExpression(macro.value.value, scope)
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
				if (v.default != null) defaults[k] = v.default;
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
							? evaluateExpression(v.value, mixedScope)
							: v.type === 'automation' && v.value
								? evalAutomationValue(this.automations.find(a => a.id === v.value)!, this.frame)
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
							? evaluateExpression(macro.value.value, scope)
							: genEmptyValue(macro);

				if (macro.type === 'image') {
					groupMacroValues[macro.name] = serializeAsset(
						this.assets.find(a => a.id === groupMacroValues[macro.name]));
				}
			}

			this.evalNodeParams(node.nodes, {
				...scope,
				...groupMacroValues,
			});
		}
	}

	private evalCacheKey(node: GsNode, visited: GsNode['id'][] = []): string | null {
		if (visited.includes(node.id)) {
			throw new Error('circular dependency detected');
		}

		let key = `isEnabled=${node.isEnabled};`;

		if (node.type === 'group') {
			for (const n of node.nodes) {
				const childKey = this.evalCacheKey(n, [...visited, node.id]);
				if (childKey == null) return null;
				key += `childKey=${childKey};`;
			}

			// TODO: macro
		} else {
			if (fxs[node.fx].disableCache) {
				return null;
			}

			const paramDefs = fxs[node.fx].paramDefs;

			for (const [k, v] of Object.entries(this.evaledNodeParams.get(node.id)!)) {
				key += `${k}=${JSON.stringify(v)};`;

				if (paramDefs[k].type === 'node') {
					if (v) {
						const targetNode = this.findNode(v);
						if (targetNode) {
							const targetNodeCacheKey = this.evalCacheKey(targetNode, [...visited, node.id]);
							if (targetNodeCacheKey == null) return null;
							key += `${k}=${targetNodeCacheKey};`;
						}
					}
				} else if (paramDefs[k].type === 'nodes') {
					for (const n of v) {
						const targetNode = this.findNode(n);
						if (targetNode) {
							const targetNodeCacheKey = this.evalCacheKey(targetNode, [...visited, node.id]);
							if (targetNodeCacheKey == null) return null;
							key += `${k}=${targetNodeCacheKey};`;
						}
					}
				}
			}
		}

		return key;
	}

	private renderNode(node: GsNode, commandEncoder: GPUCommandEncoder, visited: GsNode['id'][]): GsFxNode['id'] | void {
		if (visited.includes(node.id)) {
			throw new Error('circular dependency detected');
		}

		if (node.type === 'group') {
			if (node.nodes.length === 0) {
				return;
			}
			return this.renderNode(node.nodes.at(-1)!, commandEncoder, [...visited, node.id]);
		}

		const key = this.evalCacheKey(node);
		//console.log('Cache key for node', node.id, ':', key);
		const prevKey = this.effectCacheKeys.get(node.id);
		if (key != null && key === prevKey) {
			return;
		}
		if (key != null) this.effectCacheKeys.set(node.id, key);

		const effect = fxs[node.fx];

		const params = this.evaledNodeParams.get(node.id)!;

		for (const [k, _] of Object.entries(effect.paramDefs).filter(([, v]) => v.type === 'node')) {
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
				effect.paramDefs[k].type === 'node' ? params[k] == null ? this.fallbackTexture : this.effectOuts.get(getActualOutputNodeId(this.findNode(params[k])!)!)! :
				effect.paramDefs[k].type === 'image' ? this.assetTextures.get(params[k])! :
				effect.paramDefs[k].type === 'video' ? this.videoFrames.get(node.id)! :
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

		return node.id;
	}

	public render(renderNodeId: string | null | undefined, args: {
		time: number;
		mouseX?: number;
		mouseY?: number;
		frame?: number;
	}) {
		if (renderNodeId == null) return;
		const node = this.findNode(renderNodeId);
		if (node == null) return;

		const timeDelta = args.time - this.latestTimestamp;

		this.evalNodeParams(this.nodes, {
			TIME: args.time / 1000, // ms to seconds
		});

		const commandEncoder = this.gpuDevice.createCommandEncoder();

		this.renderNode(node, commandEncoder, []);

		//#region nodeのoutをcanvasに描画
		const actualOutputNodeId = getActualOutputNodeId(node);
		if (actualOutputNodeId == null) return;
		const out = this.effectOuts.get(actualOutputNodeId);
		if (out == null) return;
		if (this.finalRenderBindGroup == null || this.finalRenderInputTexture !== out) {
			this.finalRenderInputTexture = out;
			this.finalRenderBindGroup = this.gpuDevice.createBindGroup({
				layout: this.finalRenderPipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 1, resource: { buffer: this.finalRenderUniformBuffer } },
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

		this.gpuHistogram.render(commandEncoder, this.finalRenderInputTexture);
		this.gpuWaveform.render(commandEncoder, this.finalRenderInputTexture);

		this.gpuDevice.queue.submit([commandEncoder.finish()]);
		//#endregion

		this.latestTimestamp = args.time;

		this.fpsAverage.addSample(1000 / timeDelta);

		if (this.enableStats) {
			this.timingHelper.getResult().then(gpuTime => {
				this.gpuAverageFast.addSample(gpuTime / 1000);
				this.gpuAverageMedium.addSample(gpuTime / 1000);
				this.gpuAverageSlow.addSample(gpuTime / 1000);
			});
		}
	}

	public updateNodes(newNodes: GsNode[]) {
		const oldFxNodes = getFxNodes(this.nodes);
		const newFxNodes = getFxNodes(newNodes);
		const oldNodeIds = new Set(oldFxNodes.map(node => node.id));
		const newNodeIds = new Set(newFxNodes.map(node => node.id));
		const addedNodes = newFxNodes.filter(node => !oldNodeIds.has(node.id));
		const removedNodes = oldFxNodes.filter(node => !newNodeIds.has(node.id));

		for (const node of addedNodes) {
			const effect = fxs[node.fx];
			const out = effect.getOut({
				wgpu: { device: this.gpuDevice, enableFloat32Filtering: this.enableFloat32Filtering },
				resolution: { width: this.resolution.width, height: this.resolution.height },
			});
			this.effectOuts.set(node.id, out);
		}

		for (const node of removedNodes) {
			const out = this.effectOuts.get(node.id);
			if (out) {
				out.destroy();
				this.effectOuts.delete(node.id);
			}
			const instance = this.effectInstances.get(node.id);
			if (instance) {
				instance.dispose();
				this.effectInstances.delete(node.id);
			}
		}

		this.nodes = deepClone(newNodes);
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

	public updateVideoFrame(nodeId: GsFxNode['id'], videoFrame: VideoFrame | null) {
		this.videoFrames.get(nodeId)?.close();
		if (videoFrame) {
			this.videoFrames.set(nodeId, videoFrame);
		} else {
			this.videoFrames.delete(nodeId);
		}
	}

	public async bakeAssets() {
		for (const [k, v] of this.assetTextures.entries()) {
			v.destroy();
			this.assetTextures.delete(k);
		}

		for (const asset of this.assets) {
			if (asset.fileDataType.startsWith('image/') && asset.data != null) {
				const tex = createTextureFromSource(this.gpuDevice, {
					data: asset.data,
					width: asset.width,
					height: asset.height,
				});
				this.assetTextures.set(asset.id, tex);
			}
		}
	}

	public fpsLimit: number | null = 60;
	private currentRafId: number | null = null;

	public startRenderLoop() {
		this.stopRenderLoop();
		let then = 0;
		const interval = 1000 / (this.fpsLimit ?? 30);

		const renderLoop = (timeStamp: number) => {
			this.currentRafId = requestAnimationFrame(renderLoop);

			if (this.fpsLimit != null) {
				const delta = timeStamp - then;
				if (delta <= interval) return;
				then = timeStamp - (delta % interval);
			}

			this.render(this.nodes.at(-1)?.id, {
				time: timeStamp,
			});
		};

		this.currentRafId = requestAnimationFrame(renderLoop);
	}

	public stopRenderLoop() {
		if (this.currentRafId != null) {
			cancelAnimationFrame(this.currentRafId);
			this.currentRafId = null;
		}
	}

	// TODO: もっとスマートなリソース更新方法を考える
	public resize(resolution: {
		width: number;
		height: number;
	}) {
		this.stopRenderLoop();
		this.resolution = resolution;

		for (const instance of this.effectInstances.values()) {
			instance?.dispose();
		}
		this.effectInstances.clear();

		for (const out of this.effectOuts.values()) {
			out.destroy();
		}
		this.effectOuts.clear();

		const currentNodes = this.nodes;
		this.updateNodes([]);
		this.updateNodes(currentNodes);

		this.startRenderLoop();
	}

	public destroy() {
		for (const frame of this.videoFrames.values()) frame.close();
		this.videoFrames.clear();
		this.gpuHistogram.dispose();
		this.gpuWaveform.dispose();

		for (const instance of this.effectInstances.values()) {
			instance?.dispose();
		}
		this.effectInstances.clear();

		for (const out of this.effectOuts.values()) {
			out.destroy();
		}
		this.effectOuts.clear();

		this.gpuDevice?.destroy();
	}
}
