import { createTextureFromSource, makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import * as AiScript from '@syuilo/aiscript';
import { evalAutomationValue, genEmptyValue } from '@glitch/shared/utility/misc.ts';
import { fxDefinitions } from '@glitch/shared/fx-definitions.ts';
import { playerAudioSourceId } from '@glitch/shared/audio.ts';
import { AudioHistory } from '@glitch/shared/audio-history.ts';
import defaultVertexShaderCode from './vertex.wgsl?raw';
import TimingHelper from './utility/TimingHelper.ts';
import { fxImplementations } from './fx-implementations.ts';
import finalRenderShaderCode from './render.wgsl?raw';
import { NonNegativeRollingAverage } from './utility/NonNegativeRollingAverage.ts';
import { GpuHistogram } from './utility/histogram/GpuHistogram.ts';
import { GpuWaveform } from './utility/waveform/GpuWaveform.ts';
import { GpuMemoryTracker } from './utility/GpuMemoryTracker.ts';
import { float32ToFloat16Bits } from './utility/float32ToFloat16Bits.ts';
import type { AudioCaptureMessage, AudioSourceId } from '@glitch/shared/audio.ts';
import type { Asset, Macro, GsAutomation, GsFxNode, GsNode, GsGroupNode, Player } from '@glitch/shared/types.ts';
import type { EffectInstance } from './fx-implementation.ts';

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

function getFxNodes(nodes: GsNode[]): GsFxNode[] {
	return nodes.flatMap(node => node.type === 'group' ? getFxNodes(node.nodes) : [node]);
}

export class Renderer {
	private gpuContext: GPUCanvasContext;
	private gpuDevice: GPUDevice;
	private resolution: { width: number; height: number; };
	private defaultVertexShaderModule: GPUShaderModule;
	private fallbackTexture: GPUTexture;
	private fallbackScalarFieldTexture: GPUTexture;
	private enableStats = true;
	private nodes: GsNode[] = [];
	private assets: Asset[] = [];
	private macros: Macro[] = [];
	private automations: GsAutomation[] = [];
	private assetTextures: Map<string, GPUTexture> = new Map();
	private videoFrames: Map<Player['id'], VideoFrame> = new Map();
	private audioSources = new Map<AudioSourceId, AudioHistory>();
	private audioPorts = new Map<AudioSourceId, MessagePort>();
	private effectInstances: Map<GsFxNode['id'], EffectInstance | null> = new Map();
	private effectScalarFieldTextures: Map<GsFxNode['id'], Record<string, GPUTexture>> = new Map();
	private effectOuts: Map<GsFxNode['id'], {
		texture: GPUTexture;
		textureView: GPUTextureView;
		previousFrameTexture?: GPUTexture;
		previousFrameTextureView?: GPUTextureView;
	}> = new Map();
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
	private pointerPosition: { x: number; y: number } = { x: -99999, y: -99999 };
	private pointerPositionPrev: { x: number; y: number } = { x: -99999, y: -99999 };
	private lastPointerUpdateTimestamp = 0;
	private histogramGpuContext: GPUCanvasContext;
	private waveformGpuContext: GPUCanvasContext;
	private gpuHistogram: GpuHistogram;
	private gpuWaveform: GpuWaveform;
	private timeDelta = 0;
	public gpuAverageFast = new NonNegativeRollingAverage(10);
	public gpuAverageMedium = new NonNegativeRollingAverage(100);
	public gpuAverageSlow = new NonNegativeRollingAverage(1000);
	public fpsAverage = new NonNegativeRollingAverage(30);
	public readonly gpuMemory: GpuMemoryTracker;
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
		fpsLimit: number | null;
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
		this.fpsLimit = options.fpsLimit;
		this.gpuDevice = options.gpuDevice;
		this.gpuMemory = new GpuMemoryTracker(this.gpuDevice);
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

		this.fallbackScalarFieldTexture = this.gpuDevice.createTexture({
			size: [1, 1],
			format: this.enableFloat32Filtering ? 'r32float' : 'r16float',
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST,
		});

		const pixelData = this.enableFloat32Filtering
			? new Float32Array([0])
			: new Uint16Array([float32ToFloat16Bits(0)]);

		this.gpuDevice.queue.writeTexture(
			{ texture: this.fallbackScalarFieldTexture },
			pixelData,
			{ bytesPerRow: pixelData.byteLength, rowsPerImage: 1 },
			{ width: 1, height: 1 },
		);

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

	// 無効なFXは主入力をそのまま公開する。テクスチャの所有権や履歴は元のノードに残す。
	// 描画・入力参照・キャッシュが同じ接続関係を扱うよう、ここで共通して解決する。
	private getOutputNode(node: GsNode | undefined, visited: GsNode['id'][] = []): GsFxNode | undefined {
		if (node == null) return;
		if (visited.includes(node.id)) throw new Error('circular dependency detected');
		const nextVisited = [...visited, node.id];
		if (node.type === 'group') {
			// グループには主入力がないため、無効時は子の出力も公開しない。
			return node.isBypass ? this.getOutputNode(node.nodes.at(-1), nextVisited) : undefined;
		}
		if (node.isBypass) return node;
		const primary = Object.entries(fxDefinitions[node.fx].paramDefs).find(([, def]) => def.type === 'node' && def.primary);
		const inputId = primary ? this.evaledNodeParams.get(node.id)?.[primary[0]] : null;
		return inputId == null ? undefined : this.getOutputNode(this.findNode(inputId), nextVisited);
	}

	private getOutputTexture(node: GsNode | undefined): GPUTexture | undefined {
		const output = this.getOutputNode(node);
		return output == null ? undefined : this.effectOuts.get(output.id)?.texture;
	}

	private evalNodeParams(nodes: GsNode[], provideVars: Record<string, any> = {}) {
		const scope = {
			WIDTH: this.resolution.width,
			HEIGHT: this.resolution.height,
			...provideVars,
		};

		// Mixin (global) macros
		// TODO: automation support
		// TODO: node support
		const macroScope = {} as Record<string, any>;
		for (const macro of this.macros) {
			macroScope[macro.name] =
				macro.value.type === 'literal'
					? macro.value.value
					: macro.value.expression
						? evaluateExpression(macro.value.expression, scope)
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
			const paramDefs = fxDefinitions[node.fx].paramDefs;

			const evaluatedParams = {} as Record<string, any>;

			const mixedScope = {
				...macroScope,
				...automationScope,
				...scope,
			};

			for (const [k, v] of Object.entries(node.params)) {
				// 無効時はバイパス先だけが必要。使わない式やオートメーションも評価しない。
				if (!node.isBypass && !(paramDefs[k].type === 'node' && paramDefs[k].primary)) continue;
				evaluatedParams[k] =
					v.type === 'literal'
						? v.value
						: v.type === 'expression' && v.expression
							? evaluateExpression(v.expression, mixedScope)
							: v.type === 'automation' && v.automationId
								? evalAutomationValue(this.automations.find(a => a.id === v.automationId)!, this.frame)
								: v.type === 'node' && v.nodeId
									? v.nodeId
									: genEmptyValue(paramDefs[k]);
			}

			this.evaledNodeParams.set(node.id, evaluatedParams);

			for (const [k, v] of Object.entries(evaluatedParams)) {
				if (paramDefs[k].canNode && node.params[k].type !== 'node') {
					const tex = this.effectScalarFieldTextures.get(node.id)![k];
					const pixelData = this.enableFloat32Filtering
						? new Float32Array([v ?? 0])
						: new Uint16Array([float32ToFloat16Bits(v ?? 0)]);

					this.gpuDevice.queue.writeTexture(
						{ texture: tex },
						pixelData,
						{ bytesPerRow: pixelData.byteLength, rowsPerImage: 1 },
						{ width: 1, height: 1 },
					);
				}
			}
		}

		for (const node of nodes.filter((n): n is GsGroupNode => n.type === 'group')) {
			const groupMacroValues = {} as Record<string, any>;
			// TODO: automation support
			// TODO: node support
			for (const macro of node.macros) {
				groupMacroValues[macro.name] =
					macro.value.type === 'literal'
						? macro.value.value
						: macro.value.expression
							? evaluateExpression(macro.value.expression, scope)
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

		let key = `node=${JSON.stringify(node.id)};isBypass=${node.isBypass};`;

		if (node.type === 'group' || !node.isBypass) {
			// 出力に寄与しない入力やdisableCacheには依存しない。
			// 出力元のIDもキーに含め、同じパラメータの別ノードへの切り替えを検出する。
			const output = this.getOutputNode(node);
			if (output == null) return `${key}output=none;`;
			const outputKey = this.evalCacheKey(output, [...visited, node.id]);
			return outputKey == null ? null : `${key}output=${outputKey};`;
		} else {
			if (fxImplementations[node.fx].disableCache) {
				return null;
			}

			const paramDefs = fxDefinitions[node.fx].paramDefs;

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
				} else if (paramDefs[k].canNode && node.params[k].type === 'node') {
					if (v) {
						const targetNode = this.findNode(v);
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

	private resolveParams(node: GsFxNode, params: Record<string, any>): Record<string, any> {
		const resolvedParams = {};
		for (const [k, v] of Object.entries(params)) {
			const typeDef = fxDefinitions[node.fx].paramDefs[k].type;
			if (typeDef === 'node') {
				resolvedParams[k] = this.getOutputTexture(v == null ? undefined : this.findNode(v)) ?? this.fallbackTexture;
			} else if (typeDef === 'image') {
				resolvedParams[k] = this.assetTextures.get(v)!;
			} else if (typeDef === 'player') {
				resolvedParams[k] = v == null ? null : {
					videoFrame: this.videoFrames.get(v) ?? null,
					audio: this.audioSources.get(playerAudioSourceId(v)) ?? null,
				};
			} else {
				if (fxDefinitions[node.fx].paramDefs[k].canNode) {
					// 出力なしの扱いは参照側の型で決める（画像は透明、スカラー場は0）。
					resolvedParams[k] = v == null ? this.fallbackScalarFieldTexture : node.params[k].type === 'node' ? this.getOutputTexture(this.findNode(v)) ?? this.fallbackScalarFieldTexture : this.effectScalarFieldTextures.get(node.id)![k];
				} else {
					resolvedParams[k] = v;
				}
			}
		}
		return resolvedParams;
	}

	private renderNode(node: GsNode, commandEncoder: GPUCommandEncoder, context: { visited: Set<GsNode['id']>; rendered: Set<GsNode['id']>; }): void {
		if (context.visited.has(node.id)) {
			throw new Error('circular dependency detected');
		}
		if (context.rendered.has(node.id)) { // キャッシュが無効だったとしても同じフレーム内に同じノードを複数回レンダリングするのは無駄(というかping-pongするエフェクトなら結果がおかしくなる)なため弾く
			return;
		}

		if (node.type === 'group' || !node.isBypass) {
			// 無効中は自身を描画せず、主入力だけを更新する。履歴は保持して再有効化時に再開する。
			const output = this.getOutputNode(node);
			if (output == null) return;
			return this.renderNode(output, commandEncoder, {
				visited: new Set([...context.visited, node.id]),
				rendered: context.rendered,
			});
		}

		const key = this.evalCacheKey(node);
		//console.log('Cache key for node', node.id, ':', key);
		const prevKey = this.effectCacheKeys.get(node.id);
		if (key != null && key === prevKey) {
			return;
		}
		if (key != null) this.effectCacheKeys.set(node.id, key);

		const effect = fxImplementations[node.fx];

		const params = this.evaledNodeParams.get(node.id)!;

		for (const [k, _] of Object.entries(fxDefinitions[node.fx].paramDefs).filter(([, v]) => v.type === 'node')) {
			const v = params[k];
			if (v == null) {
				continue;
			}
			const targetNode = this.findNode(v);
			if (targetNode) {
				this.renderNode(targetNode, commandEncoder, {
					visited: new Set([...context.visited, node.id]),
					rendered: context.rendered,
				});
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
		for (const [k, _] of Object.entries(fxDefinitions[node.fx].paramDefs).filter(([, v]) => v.canNode)) {
			const v = params[k];
			if (v == null) {
				continue;
			}
			const targetNode = this.findNode(v);
			if (targetNode) {
				this.renderNode(targetNode, commandEncoder, {
					visited: new Set([...context.visited, node.id]),
					rendered: context.rendered,
				});
			}
		}

		const resolvedParams = this.resolveParams(node, params);

		let effectInstance = this.effectInstances.get(node.id);
		if (effectInstance == null) {
			effectInstance = effect.init({
				resolution: { width: this.resolution.width, height: this.resolution.height },
				wgpu: { device: this.gpuDevice, context: this.gpuContext, defaultVertexShaderModule: this.defaultVertexShaderModule, enableFloat32Filtering: this.enableFloat32Filtering },
				params: resolvedParams,
				fallbackTexture: this.fallbackTexture,
			});
			this.effectInstances.set(node.id, effectInstance);
		}

		const effectOut = this.effectOuts.get(node.id)!;

		// 現在公開されている出力を、前回の結果として読む
		const previousFrameTexture = effect.needsPreviousFrame ? effectOut.texture : undefined;
		const previousFrameTextureView = effect.needsPreviousFrame ? effectOut.textureView : undefined;

		// もう1枚へ書く
		const outputTexture = effect.needsPreviousFrame ? effectOut.previousFrameTexture! : effectOut.texture;
		const outputTextureView = effect.needsPreviousFrame ? effectOut.previousFrameTextureView! : effectOut.textureView;

		effectInstance.render({
			time: performance.now() / 1000,
			timeDelta: this.timeDelta,
			pointerPosition: this.pointerPosition,
			pointerVector: {
				x: this.pointerPositionPrev.x === -99999 ? 0 : this.pointerPosition.x - this.pointerPositionPrev.x,
				y: this.pointerPositionPrev.y === -99999 ? 0 : this.pointerPosition.y - this.pointerPositionPrev.y,
			},
			params: resolvedParams,
			previousFrameTexture,
			previousFrameTextureView,
			commandEncoder: commandEncoder,
			createPassEncoder: (commandEncoder, descriptor) => {
				const _descriptor = descriptor ?? {
					colorAttachments: [{
						view: outputTextureView,
						clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
						loadOp: 'clear',
						storeOp: 'store',
					}],
				} satisfies GPURenderPassDescriptor;
				return this.enableStats ? this.timingHelper.beginRenderPass(commandEncoder, _descriptor) : commandEncoder.beginRenderPass(_descriptor);
			},
			createComputePassEncoder: (commandEncoder, descriptor) => {
				return this.enableStats ? this.timingHelper.beginComputePass(commandEncoder, descriptor) : commandEncoder.beginComputePass(descriptor);
			},
		});

		if (effect.needsPreviousFrame) {
			// 今回書いた結果を後段へ公開
			effectOut.texture = outputTexture;
			effectOut.textureView = outputTextureView;

			// 今回読んだものを次回の書き込み先として保持
			effectOut.previousFrameTexture = previousFrameTexture!;
			effectOut.previousFrameTextureView = previousFrameTextureView!;
		}

		context.rendered.add(node.id);
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

		this.timeDelta = args.time - this.latestTimestamp;

		if (this.lastPointerUpdateTimestamp + 30 < performance.now()) {
			this.pointerPosition = { x: -99999, y: -99999 };
		}

		this.evalNodeParams(this.nodes, {
			TIME: args.time / 1000, // ms to seconds
		});

		const commandEncoder = this.gpuDevice.createCommandEncoder();

		this.renderNode(node, commandEncoder, {
			visited: new Set<GsNode['id']>(),
			rendered: new Set<GsNode['id']>(),
		});

		//#region nodeのoutをcanvasに描画
		// 末尾が無効でもバイパス先を表示する。出力なしでも描画し、前の画像を残さない。
		const outputTexture = this.getOutputTexture(node) ?? this.fallbackTexture;
		if (this.finalRenderBindGroup == null || this.finalRenderInputTexture !== outputTexture) {
			this.finalRenderInputTexture = outputTexture;
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

		this.pointerPositionPrev = { ...this.pointerPosition };

		this.latestTimestamp = args.time;

		this.fpsAverage.addSample(1000 / this.timeDelta);

		if (this.enableStats) {
			this.timingHelper.getResult().then(gpuTime => {
				this.gpuAverageFast.addSample(gpuTime / 1000);
				this.gpuAverageMedium.addSample(gpuTime / 1000);
				this.gpuAverageSlow.addSample(gpuTime / 1000);
			});
		}
	}

	// (非workerで)呼び出すときはnewNodesを独立した参照にすること！ パフォーマンス上の理由でこちら側ではdeepCloneしません
	public updateNodes(newNodes: GsNode[]) {
		const oldFxNodes = getFxNodes(this.nodes);
		const newFxNodes = getFxNodes(newNodes);
		const oldNodeIds = new Set(oldFxNodes.map(node => node.id));
		const newNodeIds = new Set(newFxNodes.map(node => node.id));
		const addedNodes = newFxNodes.filter(node => !oldNodeIds.has(node.id));
		const removedNodes = oldFxNodes.filter(node => !newNodeIds.has(node.id));

		for (const node of addedNodes) {
			const effect = fxImplementations[node.fx];
			const outTexture = effect.getOut({
				wgpu: { device: this.gpuDevice, enableFloat32Filtering: this.enableFloat32Filtering },
				resolution: { width: this.resolution.width, height: this.resolution.height },
			});
			const outTextureView = outTexture.createView();
			let previousFrameTexture;
			let previousFrameTextureView;
			if (effect.needsPreviousFrame) {
				previousFrameTexture = effect.getOut({
					wgpu: { device: this.gpuDevice, enableFloat32Filtering: this.enableFloat32Filtering },
					resolution: { width: this.resolution.width, height: this.resolution.height },
				});
				previousFrameTextureView = previousFrameTexture.createView();
			}
			this.effectOuts.set(node.id, {
				texture: outTexture,
				textureView: outTextureView,
				previousFrameTexture: previousFrameTexture,
				previousFrameTextureView: previousFrameTextureView,
			});
			const paramDefs = fxDefinitions[node.fx].paramDefs;
			const scalarFieldTextures: Record<string, GPUTexture> = {};
			for (const k in paramDefs) {
				if (paramDefs[k].canNode) {
					const tex = this.gpuDevice.createTexture({
						size: [1, 1],
						format: this.enableFloat32Filtering ? 'r32float' : 'r16float',
						usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST,
					});
					scalarFieldTextures[k] = tex;
				}
			}
			this.effectScalarFieldTextures.set(node.id, scalarFieldTextures);
		}

		for (const node of removedNodes) {
			const out = this.effectOuts.get(node.id);
			if (out) {
				out.texture.destroy();
				if (out.previousFrameTexture) {
					out.previousFrameTexture.destroy();
				}
				this.effectOuts.delete(node.id);
			}
			const instance = this.effectInstances.get(node.id);
			if (instance) {
				instance.dispose();
				this.effectInstances.delete(node.id);
			}
			const scalarFieldTextures = this.effectScalarFieldTextures.get(node.id);
			if (scalarFieldTextures) {
				for (const k in scalarFieldTextures) {
					scalarFieldTextures[k].destroy();
				}
				this.effectScalarFieldTextures.delete(node.id);
			}
		}

		this.nodes = newNodes;
	}

	// (非workerで)呼び出すときはnewAssetsを独立した参照にすること！ パフォーマンス上の理由でこちら側ではdeepCloneしません
	public updateAssets(newAssets: Asset[]) {
		this.assets = newAssets;
		this.bakeAssets();
	}

	// (非workerで)呼び出すときはnewMacrosを独立した参照にすること！ パフォーマンス上の理由でこちら側ではdeepCloneしません
	public updateMacros(newMacros: Macro[]) {
		this.macros = newMacros;
	}

	// (非workerで)呼び出すときはnewAutomationsを独立した参照にすること！ パフォーマンス上の理由でこちら側ではdeepCloneしません
	public updateAutomations(newAutomations: GsAutomation[]) {
		this.automations = newAutomations;
	}

	public attachAudioSource(id: AudioSourceId, port: MessagePort) {
		this.resetAudioSource(id, null);
		const history = new AudioHistory();
		this.audioSources.set(id, history);
		this.audioPorts.set(id, port);
		port.onmessage = (event: MessageEvent<AudioCaptureMessage>) => {
			if (this.audioPorts.get(id) !== port) return;
			const message = event.data;
			if (message.type === 'reset') {
				if (message.generation >= history.generation) history.reset(message.generation);
			} else if (message.type === 'samples') {
				try {
					if (message.frameCount === 1024 && message.buffer.byteLength === 8192
						&& (message.channelCount === 1 || message.channelCount === 2)
						&& Number.isFinite(message.sampleRate) && message.sampleRate >= 8000 && message.sampleRate <= 192000
						&& Number.isSafeInteger(message.startFrame) && message.startFrame >= 0) history.append(message);
				} finally {
					port.postMessage({ type: 'recycle', buffer: message.buffer }, [message.buffer]);
				}
			}
		};
	}

	public resetAudioSource(id: AudioSourceId, generation: number | null) {
		const history = this.audioSources.get(id);
		if (generation == null) {
			history?.reset();
			this.audioPorts.get(id)?.close();
			this.audioPorts.delete(id);
			this.audioSources.delete(id);
		} else if (history && generation >= history.generation) {
			history.reset(generation);
		}
	}

	public updateVideoFrame(playerId: Player['id'], videoFrame: VideoFrame | null) {
		this.videoFrames.get(playerId)?.close();
		if (videoFrame) {
			this.videoFrames.set(playerId, videoFrame);
		} else {
			this.videoFrames.delete(playerId);
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

	public updatePointerPosition(newPointerPosition: { x: number; y: number }) {
		this.pointerPosition = newPointerPosition;
		this.lastPointerUpdateTimestamp = performance.now();
	}

	private fpsLimit: number | null;
	private currentRafId: number | null = null;

	public changeFpsLimit(newFpsLimit: number | null) {
		this.fpsLimit = newFpsLimit;
		this.stopRenderLoop();
		this.startRenderLoop();
	}

	public startRenderLoop() {
		this.stopRenderLoop();
		let then = 0;
		const interval = 1000 / (this.fpsLimit ?? 999);

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
			out.texture.destroy();
			if (out.previousFrameTexture) {
				out.previousFrameTexture.destroy();
			}
		}
		this.effectOuts.clear();

		const currentNodes = this.nodes;
		this.updateNodes([]);
		this.updateNodes(currentNodes);

		this.startRenderLoop();
	}

	public destroy() {
		for (const id of this.audioPorts.keys()) this.resetAudioSource(id, null);
		for (const frame of this.videoFrames.values()) frame.close();
		this.videoFrames.clear();
		this.gpuHistogram.dispose();
		this.gpuWaveform.dispose();

		for (const instance of this.effectInstances.values()) {
			instance?.dispose();
		}
		this.effectInstances.clear();

		for (const out of this.effectOuts.values()) {
			out.texture.destroy();
			if (out.previousFrameTexture) {
				out.previousFrameTexture.destroy();
			}
		}
		this.effectOuts.clear();

		this.gpuDevice?.destroy();
	}
}
