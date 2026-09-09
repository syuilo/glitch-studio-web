import { ref, shallowReactive } from 'vue';
import { GsAutomation } from './types.ts';
import type { GsFxNode, GsNode, Renderer } from './renderer.ts';
import { Asset, Macro } from '@/types.ts';
import { deepClone } from '@/utility/deep-clone.ts';
import { isVideoFrameAvailable, playVideoAfterFirstFrameIsReady } from '@/utility/video.ts';
import * as ui from '@/ui.ts';
import { deepEqual } from '@/utility/deep-equal.ts';

function getFxNodes(nodes: GsNode[]): GsFxNode[] {
	return nodes.flatMap(node => node.type === 'group' ? getFxNodes(node.nodes) : [node]);
}

function setupWebcam() {
	return new Promise((resolve, reject) => {
		navigator.mediaDevices.getUserMedia({
			video: true,
			audio: false,
		}).then(localMediaStream => {
			resolve(localMediaStream);
		}).catch(err => {
			if (err.name === 'PermissionDeniedError') {
				ui.alert({
					type: 'error',
					title: 'Failed to access webcam',
					text: 'denied permission',
				});
			} else {
				ui.alert({
					type: 'error',
					title: 'Failed to access webcam',
					text: err.message,
				});
			}
			reject(err);
		});
	});
}

export class Engine {
	public canvas: HTMLCanvasElement;

	//private renderer: Renderer | null = null;
	private rendererWorker: Worker | null = null;

	private enableFloat32Filtering = false;
	private enableStats = true;
	private nodes: GsNode[] = [];
	private assets: Asset[] = [];
	private macros: Macro[] = [];
	private automations: GsAutomation[] = [];
	private histogramCanvas: HTMLCanvasElement | null = null;
	private waveformCanvas: HTMLCanvasElement | null = null;
	private videoElements = shallowReactive(new Map<GsFxNode['id'], HTMLVideoElement>());
	private videoLoads = new Map<string, Promise<void>>();
	public fpsLimit: number | null = 60;
	public gpuAverageDisplayFast = ref(0);
	public gpuAverageDisplayMedium = ref(0);
	public gpuAverageDisplaySlow = ref(0);
	public fpsDisplay = ref(0);
	public isReady = ref(false);

	constructor() {
		this.canvas = window.document.createElement('canvas');
		this.canvas.style.imageRendering = 'pixelated';
	}

	private call<FN extends keyof Renderer>(fn: FN, args: Parameters<Renderer[FN]> = [] as any, options?: StructuredSerializeOptions | Transferable[]): void {
		if (!this.isReady.value) {
			throw new Error('Renderer is not initialized');
		}
		if (this.rendererWorker != null) {
			this.rendererWorker.postMessage({ type: 'call', fn, args }, options);
		//} else if (this.renderer != null) {
		//	this.renderer[fn](...args);
		} else {
			throw new Error('Renderer is not initialized');
		}
	}

	public async init(resolution: { width: number; height: number }) {
		// Scaled preview dimensions can be fractional. Use the same integer pixel
		// dimensions for the canvas, textures, shader uniforms, and storage buffers.
		resolution = {
			width: Math.max(1, Math.floor(resolution.width)),
			height: Math.max(1, Math.floor(resolution.height)),
		};

		if (resolution.width > 8192 || resolution.height > 8192) {
			ui.alert({
				type: 'error',
				text: 'maximum supported resolution is 8192x8192',
			});
			throw new Error('maximum supported resolution is 8192x8192');
		}

		this.canvas.width = resolution.width;
		this.canvas.height = resolution.height;

		const createWorker = () => new Promise((resolve) => {
			import('./rendererWorker?worker').then(({ default: RendererWorker }) => {
				const worker = new RendererWorker();
				worker.postMessage({ type: 'init', canvas: offscreen, options: {
					resolution,
					enableFloat32Filtering: this.enableFloat32Filtering,
					enableStats: this.enableStats,
					assets: this.assets,
					macros: this.macros,
					automations: this.automations,
					nodes: this.nodes,
				} }, [offscreen]);
				resolve(worker);
			});
		});

		const { promise: ready, resolve: resolveReady } = Promise.withResolvers<void>();

		const offscreen = this.canvas.transferControlToOffscreen();
		this.rendererWorker = await createWorker();
		this.rendererWorker.onmessage = (event) => {
			switch (event.data?.type) {
				case 'inited': {
					this.isReady.value = true;
					console.log('Renderer worker initialized!');
					resolveReady();
					break;
				}
				default: {
					console.warn('Unrecognized message from worker:', event.data?.type);
				}
			}
		};

		await ready;
	}

	/*
	public render(timeStamp: number, renderNodeId: string | null) {
		if (!this.isReady.value) return;
		if (this.nodes.length === 0) return;

		this.call('render', [renderNodeId ?? this.nodes.at(-1)!.id, {
			time: timeStamp,
		}]);

		//this.fpsDisplay.value = this.renderer.fpsAverage.get();

		if (this.enableStats) {
			//this.gpuAverageDisplayFast.value = this.renderer.gpuAverageFast.get();
			//this.gpuAverageDisplayMedium.value = this.renderer.gpuAverageMedium.get();
			//this.gpuAverageDisplaySlow.value = this.renderer.gpuAverageSlow.get();
		}
	}
		*/

	public startRenderLoop() {
		this.call('startRenderLoop', []);
	}

	public stopRenderLoop() {
		this.call('stopRenderLoop', []);
	}

	public async updateNodes(newNodes: GsNode[]) {
		const oldFxNodes = getFxNodes(this.nodes);
		const newFxNodes = getFxNodes(newNodes);
		const nodes = deepClone(newNodes);
		this.nodes = nodes;

		for (const [id, video] of this.videoElements) {
			const oldNode = oldFxNodes.find(node => node.id === id);
			const newNode = newFxNodes.find(node => node.id === id);
			if (newNode?.fx !== 'video' || !deepEqual(oldNode?.params.video.value, newNode.params.video.value)) {
				video.pause();
				this.videoElements.delete(id);
				this.videoLoads.delete(id);
				URL.revokeObjectURL(video.src);
				video.removeAttribute('src');
				video.load();
			}
		}

		for (const node of newFxNodes) {
			if (node.fx === 'video' && !this.videoElements.has(node.id)) {
				if (node.params.video.value == null) continue;
				const video = window.document.createElement('video');
				video.loop = true;
				video.preload = 'auto';
				video.volume = 0.5;
				this.videoElements.set(node.id, video);
				this.videoLoads.set(node.id, new Promise<void>(resolve => {
					const finish = () => {
						video.removeEventListener('loadeddata', finish);
						video.removeEventListener('error', finish);
						video.removeEventListener('emptied', finish);
						if (video.error && this.videoElements.get(node.id) === video) {
							void ui.alert({ type: 'error', text: video.error.message });
						}
						resolve();
					};
					video.addEventListener('loadeddata', finish);
					video.addEventListener('error', finish);
					video.addEventListener('emptied', finish);
				}));

				const onVideoFrame = () => {
					const frame = new VideoFrame(video);
					this.call('updateVideoFrame', [node.id, frame], [frame]);
					video.requestVideoFrameCallback(onVideoFrame);
				};

				video.requestVideoFrameCallback(onVideoFrame);

				if (node.params.video.value.type === 'asset') {
					const asset = this.assets.find(asset => asset.id === node.params.video.value.id);
					video.src = URL.createObjectURL(asset.fileData);
				} else if (node.params.video.value.type === 'webcam') {
					this.videoLoads.set(node.id, setupWebcam().then(camera => {
						video.srcObject = camera;
						video.muted = true;
						video.playsInline = true;
						return playVideoAfterFirstFrameIsReady(video);
					}));
				}
			}
		}

		await Promise.all(this.videoLoads.values());
		if (this.nodes !== nodes) return;
		this.call('updateNodes', [this.nodes]);
	}

	public getVideoElement(nodeId: GsFxNode['id']): HTMLVideoElement | null {
		return this.videoElements.get(nodeId) ?? null;
	}

	public updateMacros(newMacros: Macro[]) {
		this.macros = deepClone(newMacros);
		this.call('updateMacros', [this.macros]);
	}

	public updateAutomations(newAutomations: GsAutomation[]) {
		this.automations = deepClone(newAutomations);
		this.call('updateAutomations', [this.automations]);
	}

	public async updateAssets(newAssets: Asset[]) {
		this.assets = deepClone(newAssets);
		await this.call('updateAssets', [this.assets]);
		await this.updateNodes(this.nodes);
	}

	public setHistogramCanvas(canvas: HTMLCanvasElement | null) {
		this.histogramCanvas = canvas;
		this.renderer?.setHistogramCanvas(canvas);
	}

	public setWaveformCanvas(canvas: HTMLCanvasElement | null) {
		this.waveformCanvas = canvas;
		this.renderer?.setWaveformCanvas(canvas);
	}

	public saveImage(options: {
		resolution: {
			width: number;
			height: number;
		};
	}) {
		const canvas = window.document.createElement('canvas');
		canvas.width = options.resolution.width;
		canvas.height = options.resolution.height;

		//const path = await api.showSaveDialog({
		//	filters: [{
		//		name: 'Image',
		//		extensions: ['png']
		//	}]
		//});
		//if (path == null) return;
		//canvas.value!.toBlob(async blob => {
		//	api.saveFile(path, await blob.arrayBuffer());
		//});
	}

	public resize(resolution: {
		width: number;
		height: number;
	}) {
		if (this.rendererWorker != null) {
			this.rendererWorker.postMessage({ type: 'resize', resolution });
		}
	}
}
