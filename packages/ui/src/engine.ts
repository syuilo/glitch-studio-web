import { ref, shallowReactive } from 'vue';
import { createRendererWorker } from '@glitch/renderer/client.ts';
import { deepEqual } from '@glitch/shared/utility/deep-equal.ts';
import { deepClone } from '@glitch/shared/utility/deep-clone.ts';
import { isVideoFrameAvailable, playVideoAfterFirstFrameIsReady } from './utility/video.ts';
import type { Asset, GsAutomation, GsFxNode, GsNode, Macro } from '@glitch/shared/types.ts';
import type { Renderer } from '@glitch/renderer/renderer.ts';
import * as ui from '@/ui.ts';

type RendererMethods = {
	[K in keyof Renderer as Renderer[K] extends (...args: never[]) => unknown ? K : never]: Renderer[K];
};

function getFxNodes(nodes: GsNode[]): GsFxNode[] {
	return nodes.flatMap(node => node.type === 'group' ? getFxNodes(node.nodes) : [node]);
}

function setupWebcam(): Promise<MediaStream> {
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
	public histogramCanvas: HTMLCanvasElement;
	public waveformCanvas: HTMLCanvasElement;

	//private renderer: Renderer | null = null;
	private rendererWorker: Worker | null = null;

	private enableFloat32Filtering = false;
	private enableStats = true;
	private nodes: GsNode[] = [];
	private assets: Asset[] = [];
	private macros: Macro[] = [];
	private automations: GsAutomation[] = [];
	private videoElements = shallowReactive(new Map<GsFxNode['id'], HTMLVideoElement>());
	private videoLoads = new Map<string, Promise<void>>();
	private videoFrameCallbacks = new Map<string, number>();
	private pendingVideoFrames = new Map<string, VideoFrame>();
	private inFlightVideoFrames = new Map<string, number>();
	private nextVideoFrameId = 0;
	private fpsLimit: number | null;
	public gpuAverageDisplayFast = ref(0);
	public gpuAverageDisplayMedium = ref(0);
	public gpuAverageDisplaySlow = ref(0);
	public fpsDisplay = ref(0);
	public isReady = ref(false);

	constructor(options: {
		fpsLimit: number | null;
	}) {
		this.canvas = window.document.createElement('canvas');
		this.canvas.style.imageRendering = 'pixelated';
		this.histogramCanvas = window.document.createElement('canvas');
		this.histogramCanvas.width = 256;
		this.histogramCanvas.height = 150;
		this.histogramCanvas.style.width = '100%';
		this.histogramCanvas.style.height = '100%';
		this.waveformCanvas = window.document.createElement('canvas');
		this.waveformCanvas.width = 512;
		this.waveformCanvas.height = 256;
		this.waveformCanvas.style.width = '100%';
		this.waveformCanvas.style.height = '100%';
		this.fpsLimit = options.fpsLimit;
	}

	private call<FN extends keyof RendererMethods>(fn: FN, args: Parameters<RendererMethods[FN]>, options?: StructuredSerializeOptions | Transferable[]): void {
		if (!this.isReady.value) {
			throw new Error('Renderer is not initialized');
		}
		if (this.rendererWorker != null) {
			this.rendererWorker.postMessage({ type: 'call', fn, args }, Array.isArray(options) ? { transfer: options } : options);
		//} else if (this.renderer != null) {
		//	this.renderer[fn](...args);
		} else {
			throw new Error('Renderer is not initialized');
		}
	}

	private sendPendingVideoFrame(nodeId: string) {
		if (!this.isReady.value || !this.rendererWorker || this.inFlightVideoFrames.has(nodeId)) return;
		const frame = this.pendingVideoFrames.get(nodeId);
		if (!frame) return;
		this.pendingVideoFrames.delete(nodeId);
		const id = this.nextVideoFrameId++;
		this.inFlightVideoFrames.set(nodeId, id);
		try {
			this.rendererWorker.postMessage({ type: 'videoFrame', nodeId, id, frame }, [frame]);
		} catch (error) {
			this.inFlightVideoFrames.delete(nodeId);
			frame.close();
			throw error;
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

		const offscreen = this.canvas.transferControlToOffscreen();
		const histogramOffscreen = this.histogramCanvas.transferControlToOffscreen();
		const waveformOffscreen = this.waveformCanvas.transferControlToOffscreen();

		const { promise: ready, resolve: resolveReady } = Promise.withResolvers<void>();

		this.rendererWorker = createRendererWorker();
		this.rendererWorker.postMessage({
			type: 'init',
			canvas: offscreen,
			histogramCanvas: histogramOffscreen,
			waveformCanvas: waveformOffscreen,
			options: {
				resolution,
				enableFloat32Filtering: this.enableFloat32Filtering,
				fpsLimit: this.fpsLimit,
				enableStats: this.enableStats,
				assets: this.assets,
				macros: this.macros,
				automations: this.automations,
				nodes: this.nodes,
			},
		}, [offscreen, histogramOffscreen, waveformOffscreen]);
		this.rendererWorker.onmessage = (event) => {
			switch (event.data?.type) {
				case 'inited': {
					this.isReady.value = true;
					for (const nodeId of this.pendingVideoFrames.keys()) this.sendPendingVideoFrame(nodeId);
					console.log('Renderer worker initialized!');
					resolveReady();
					break;
				}
				case 'videoFrameReceived': {
					const { nodeId, id } = event.data;
					if (this.inFlightVideoFrames.get(nodeId) !== id) break;
					this.inFlightVideoFrames.delete(nodeId);
					this.sendPendingVideoFrame(nodeId);
					break;
				}
				case 'stats': {
					const { stats } = event.data;
					this.fpsDisplay.value = stats.fpsAverage;
					if (this.enableStats) {
						this.gpuAverageDisplayFast.value = stats.gpuAverageFast;
						this.gpuAverageDisplayMedium.value = stats.gpuAverageMedium;
						this.gpuAverageDisplaySlow.value = stats.gpuAverageSlow;
					}
					break;
				}
				default: {
					console.warn('Unrecognized message from worker:', event.data?.type);
				}
			}
		};

		await ready;
	}

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
				const callbackId = this.videoFrameCallbacks.get(id);
				if (callbackId !== undefined) video.cancelVideoFrameCallback(callbackId);
				this.videoFrameCallbacks.delete(id);
				this.pendingVideoFrames.get(id)?.close();
				this.pendingVideoFrames.delete(id);
				// Keep the in-flight slot until its ACK, even when reusing the node ID.
				if (this.isReady.value) this.call('updateVideoFrame', [id, null]);
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
					if (this.videoElements.get(node.id) !== video) return;
					try {
						if (!isVideoFrameAvailable(video)) return;
						const frame = new VideoFrame(video);
						// Retain only the newest frame while the worker is busy.
						this.pendingVideoFrames.get(node.id)?.close();
						this.pendingVideoFrames.set(node.id, frame);
						this.sendPendingVideoFrame(node.id);
					} finally {
						this.videoFrameCallbacks.set(node.id, video.requestVideoFrameCallback(onVideoFrame));
					}
				};

				this.videoFrameCallbacks.set(node.id, video.requestVideoFrameCallback(onVideoFrame));

				if (node.params.video.value.type === 'asset') {
					const asset = this.assets.find(asset => asset.id === node.params.video.value.id)!;
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

	public changeFpsLimit(newFpsLimit: number | null) {
		this.fpsLimit = newFpsLimit;
		this.call('changeFpsLimit', [this.fpsLimit]);
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
