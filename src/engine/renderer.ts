import * as math from 'mathjs';
import { evalAutomationValue, genEmptyValue } from '@/utils';
import { fxs } from './fxs';
import { Asset, Image, FxParamValue, Macro } from '@/types';
import { GsAutomation } from './types';
import * as GIF from 'gifuct-js'
//import CpuRendererWorker from '../../main/workers/cpu-renderer?worker'

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

const evaluate = (expression: string, scope: Record<string, any>) => {
	const value = math.evaluate(expression, scope);
	if (value != null && value.toArray) {
		return value.toArray();
	} else {
		return value;
	}
};

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

const videoEl = document.createElement('video');

export class GlitchRenderer {
	private canvas: HTMLCanvasElement | null = null;
	public gl: WebGL2RenderingContext | null = null;
	public renderTextureProgram!: WebGLProgram;
	public renderInvertedTextureProgram!: WebGLProgram;
	public fxProgramCache: Map<string, WebGLProgram> = new Map();
	public nodes: GsNode[] = [];
	public assets: Asset[] = [];
	public macros: Macro[] = [];
	public automations: GsAutomation[] = [];
	public gifs: Map<string, {
		gif: GIF.ParsedGif;
		frames: GIF.ParsedFrame[];
		canvas: HTMLCanvasElement;
		canvasCtx: CanvasRenderingContext2D;
		gifCanvas: HTMLCanvasElement;
		gifCanvasCtx: CanvasRenderingContext2D;
		tempCanvas: HTMLCanvasElement;
		tempCanvasCtx: CanvasRenderingContext2D;
	} & Record<string, any>> = new Map();
	public renderWidth!: number;
	public renderHeight!: number;
	public assetTextures: Map<string, WebGLTexture> = new Map();
	public nodeCaches: Map<string, { key: string; tex: WebGLTexture, fbo: WebGLFramebuffer }> = new Map();
	public placeholderTexture!: WebGLTexture;
	public webcameraTexture!: WebGLTexture;
	public webcameraWidth: number = 0;
	public webcameraHeight: number = 0;
	public evaledNodeParams: Map<GsNode['id'], Record<string, any>> = new Map();
	public initialTime: number = Date.now();
	public frame: number = 0;
	public time: number = 0;
	public mouseX: number = 0;
	public mouseY: number = 0;

	constructor() {
	}

	public async init(canvas: HTMLCanvasElement, width: number, height: number) {
		this.canvas = canvas;
		this.canvas.width = width;
		this.canvas.height = height;
		this.renderWidth = width;
		this.renderHeight = height;

		this.gl = this.canvas.getContext('webgl2', {
			preserveDrawingBuffer: true, // パフォーマンス上 false にしたいけど true にしないとヒストグラム描画できない
			alpha: true,
			premultipliedAlpha: false,
		})!;

		const gl = this.gl;

		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

		const VERTICES = new Float32Array([-1, -1, -1, 1, 1, 1, -1, -1, 1, 1, 1, -1]);
		const vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, VERTICES, gl.STATIC_DRAW);

		this.placeholderTexture = gl.createTexture()!;
		gl.bindTexture(gl.TEXTURE_2D, this.placeholderTexture);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
			gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.bindTexture(gl.TEXTURE_2D, null);

		this.renderTextureProgram = this.initShaderProgram(`#version 300 es
			in vec2 position;
			out vec2 in_uv;

			void main() {
				in_uv = (position + 1.0) / 2.0;
				gl_Position = vec4(position, 0.0, 1.0);
			}
		`, `#version 300 es
			precision highp float;

			in vec2 in_uv;
			uniform sampler2D u_texture;
			out vec4 out_color;
			
			void main() {
				out_color = texture(u_texture, in_uv);
			}
		`)!;

		this.renderInvertedTextureProgram = this.initShaderProgram(`#version 300 es
			in vec2 position;
			out vec2 in_uv;

			void main() {
				in_uv = (position + 1.0) / 2.0;
				in_uv.y = 1.0 - in_uv.y;
				gl_Position = vec4(position, 0.0, 1.0);
			}
		`, `#version 300 es
			precision highp float;

			in vec2 in_uv;
			uniform sampler2D u_texture;
			out vec4 out_color;
			
			void main() {
				out_color = texture(u_texture, in_uv);
			}
		`)!;
	}

	public setupWebcam() {
		const gl = this.gl!;
		if (this.webcameraTexture != null) return;

		return new Promise((resolve, reject) => {
			navigator.mediaDevices.getUserMedia({
				video: true,
				audio: false
			}).then(localMediaStream => {
				const settings = localMediaStream.getVideoTracks()[0].getSettings();
				this.webcameraWidth = settings.width!;
				this.webcameraHeight = settings.height!;

				// video エレメントにイベントを設定
				videoEl.addEventListener('canplay', () => {
					// video 再生開始をコール
					videoEl.play();

					this.webcameraTexture = gl.createTexture()!;
					gl.bindTexture(gl.TEXTURE_2D, this.webcameraTexture);
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, videoEl);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.bindTexture(gl.TEXTURE_2D, null);

					resolve();
				}, true);

				// video エレメントのソースにウェブカメラを渡す
				videoEl.srcObject = localMediaStream;
			}).catch(err => {
				// 取得に失敗した原因を調査
				if(err.name === 'PermissionDeniedError'){
					// ユーザーによる利用の拒否
					alert('denied permission');
				}else{
					// デバイスが見つからない場合など
					alert('can not be used webcam');
				}

				reject(err);
			});
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

	public changeSize(width: number, height: number) {
		this.canvas.width = width;
		this.canvas.height = height;
		this.renderWidth = width;
		this.renderHeight = height;

		const gl = this.gl!;

		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

		gl.bindTexture(gl.TEXTURE_2D, this.placeholderTexture);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
			gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.bindTexture(gl.TEXTURE_2D, null);

		this.clearNodeCache();
	}

	public clearNodeCache() {
		for (const { tex, fbo } of this.nodeCaches.values()) {
			this.gl!.deleteTexture(tex);
			this.gl!.deleteFramebuffer(fbo);
		}
		this.nodeCaches.clear();
	}

	public loadShader(type, source) {
		const gl = this.gl!;

		const shader = gl.createShader(type)!;
	
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
	
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			alert(
				`falied to compile shader: ${gl.getShaderInfoLog(shader)}`,
			);
			gl.deleteShader(shader);
			return null;
		}
	
		return shader;
	}
	
	public initShaderProgram(vsSource, fsSource): WebGLProgram {
		const gl = this.gl!;

		const vertexShader = this.loadShader(gl.VERTEX_SHADER, vsSource)!;
		const fragmentShader = this.loadShader(gl.FRAGMENT_SHADER, fsSource)!;
	
		const shaderProgram = gl.createProgram()!;
		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmentShader);
		gl.linkProgram(shaderProgram);
	
		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			alert(
				`failed to init shader: ${gl.getProgramInfoLog(
					shaderProgram,
				)}`,
			);
			throw new Error("failed to init shader");
		}
	
		return shaderProgram;
	}
	
	public createTexture(): WebGLTexture {
		const gl = this.gl!;
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.bindTexture(gl.TEXTURE_2D, null);
		return texture!;
	}

	public evalNodeParams(nodes: GsNode[], provideVars: Record<string, any> = {}) {
		const scope = {
			WIDTH: this.renderWidth,
			HEIGHT: this.renderHeight,
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

	public evalCacheKey(node: GsNode, visited: GsNode['id'][] = []): string {
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

	public async renderNode(node: GsNode, visited: GsNode['id'][]): Promise<WebGLTexture> {
		if (visited.includes(node.id)) {
			throw new Error('circular dependency detected');
		}

		if (node.type === 'group') {
			if (node.nodes.length === 0) {
				return this.placeholderTexture;
			}
			return await this.renderNode(node.nodes.at(-1), [...visited, node.id]);
		}

		const gl = this.gl!;
		const fx = fxs[node.fx];
		const params = this.evaledNodeParams.get(node.id)!;

		const primaryNodeInput = Object.entries(fxs[node.fx].paramDefs).find(([k, v]) => v.type === 'node' && v.primary);
		if (!node.isEnabled && primaryNodeInput) {
			return await this.renderNode(this.findNode(params[primaryNodeInput[0]]), [...visited, node.id]);
		}

		const key = this.evalCacheKey(node);
		let cache = this.nodeCaches.get(node.id);
		if (cache == null) {
			this.nodeCaches.set(node.id, {
				key,
				tex: this.createTexture(),
				fbo: gl.createFramebuffer()!,
			});
			cache = this.nodeCaches.get(node.id)!;
		} else if (cache.key === key) {
			//console.log(`FX: ${node.fx} (cached)`, cache.key);
			return cache.tex;
		}

		const [width, height] = params._wh;

		const inputNodeTexs = {};
		for (const [k, _] of Object.entries(fx.paramDefs).filter(([k, v]) => v.type === 'node')) {
			const v = params[k];
			if (v == null) {
				inputNodeTexs[k] = this.placeholderTexture;
				continue;
			}
			const targetNode = this.findNode(v);
			if (targetNode) {
				inputNodeTexs[k] = await this.renderNode(targetNode, [...visited, node.id]);
			} else {
				inputNodeTexs[k] = this.placeholderTexture;
			}
		}
		for (const [k, _] of Object.entries(fx.paramDefs).filter(([k, v]) => v.type === 'nodes')) {
			inputNodeTexs[k] = [];
			for (const v of params[k]) {
				const targetNode = this.findNode(v);
				if (targetNode) {
					inputNodeTexs[k].push(await this.renderNode(targetNode, [...visited, node.id]));
				} else {
					inputNodeTexs[k].push(this.placeholderTexture);
				}
			}
		}

		const label = `FX: ${node.fx}`;
		//progress(i, `Applying ${node.fx}...`, { processingFxId: node.id });

		//console.time(label);

		const resultTexture = cache.tex;
		gl.bindTexture(gl.TEXTURE_2D, resultTexture);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
			gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.bindTexture(gl.TEXTURE_2D, null);

		const resultFrameBuffer = cache.fbo;
		gl.bindFramebuffer(gl.FRAMEBUFFER, resultFrameBuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, resultTexture, 0);

		if (fx.main) {
			fx.main({ renderer: this, gl, resultFrameBuffer, width, height, params, inputNodeTexs });
		} else {
			let shaderProgram = this.fxProgramCache.get(fx.name);
			if (shaderProgram == null) {
				shaderProgram = this.initShaderProgram(`#version 300 es
					in vec2 position;
					out vec2 in_uv;
		
					void main() {
						in_uv = (position + 1.0) / 2.0;
						gl_Position = vec4(position, 0.0, 1.0);
					}
				`, fx.shader);
				this.fxProgramCache.set(fx.name, shaderProgram);
			}
	
			gl.useProgram(shaderProgram);
	
			const u_resolution = gl.getUniformLocation(shaderProgram, 'u_resolution');
			gl.uniform2fv(u_resolution, [width, height]);
	
			const positionLocation = gl.getAttribLocation(shaderProgram, 'position');
			gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(positionLocation);

			fx.setup({ renderer: this, gl, shaderProgram, width, height, params, inputNodeTexs });
	
			gl.drawArrays(gl.TRIANGLES, 0, 6);
		}
		//console.timeEnd(label);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		cache.key = key;

		return resultTexture;
	}

	public async render(renderNodeId: string, args: {
		mouseX?: number;
		mouseY?: number;
		frame?: number;
	}) {
		const gl = this.gl;
		if (gl == null) {
			throw new Error('gl is not initialized');
		}

		const node = this.findNode(renderNodeId);
		if (node == null) return;

		if (this.webcameraTexture) {
			gl.bindTexture(gl.TEXTURE_2D, this.webcameraTexture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, videoEl);
			gl.bindTexture(gl.TEXTURE_2D, null);
		}

		this.frame = args.frame ?? 0;
		// timeがあまり大きくなるとパーリンノイズなどの生成結果が劣化していくため(バグ？)、現在時刻そのものではなくアプリケーションが起動してからの経過時間を使う
		this.time = (Date.now() - this.initialTime) / 1000;
		this.mouseX = args.mouseX ?? 0;
		this.mouseY = args.mouseY ?? 0;

		this.evalNodeParams(this.nodes);

		const texEffected = await this.renderNode(node, []);
	
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.useProgram(this.renderInvertedTextureProgram);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texEffected);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	public async bakeAssets() {
		const gl = this.gl;
		if (gl == null) {
			throw new Error('gl is not initialized');
		}

		for (const [k, v] of this.assetTextures.entries()) {
			gl.deleteTexture(v);
			this.assetTextures.delete(k);
		}

		for (const asset of this.assets) {
			const tex = this.createTexture();
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, asset.width, asset.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, asset.data);
			gl.bindTexture(gl.TEXTURE_2D, null);

			this.assetTextures.set(asset.id, tex);

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

		this.clearNodeCache();
	}
}
