import { ref, shallowReactive } from 'vue';
import { getFxNodes, GsFxNode, GsNode, Renderer } from './renderer.ts';
import { GsAutomation } from './types.ts';
import { Asset, Macro } from '@/types.ts';
import { deepClone } from '@/utility/deep-clone.ts';
import { isVideoFrameAvailable } from '@/utility/video.ts';
import * as ui from '@/ui.ts';

export class Engine {
	private renderer: Renderer | null = null;
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
	private currentRafId: number | null = null;
	public fpsLimit: number | null = 60;
	public gpuAverageDisplayFast = ref(0);
	public gpuAverageDisplayMedium = ref(0);
	public gpuAverageDisplaySlow = ref(0);
	public fpsDisplay = ref(0);

	constructor() {
	}

	async setCanvas(options: {
		canvas: HTMLCanvasElement;
		resolution: {
			width: number;
			height: number;
		};
	}) {
		if (this.renderer != null) {
			this.renderer.destroy();
			this.renderer = null;
		}

		// Scaled preview dimensions can be fractional. Use the same integer pixel
		// dimensions for the canvas, textures, shader uniforms, and storage buffers.
		const resolution = {
			width: Math.max(1, Math.floor(options.resolution.width)),
			height: Math.max(1, Math.floor(options.resolution.height)),
		};

		if (resolution.width > 8192 || resolution.height > 8192) {
			ui.alert({
				type: 'error',
				text: 'maximum supported resolution is 8192x8192',
			});
			throw new Error('maximum supported resolution is 8192x8192');
		}

		options.canvas.width = resolution.width;
		options.canvas.height = resolution.height;

		const adapter = await navigator.gpu?.requestAdapter({
			powerPreference: 'high-performance',
		});

		const device = await adapter?.requestDevice({
			requiredFeatures: [
				...(this.enableFloat32Filtering ? ['float32-filterable'] as const : []),
				...(this.enableStats ? ['timestamp-query'] as const : []),
			],
		});
		if (device == null) {
			window.alert('need a browser that supports WebGPU');
			throw new Error('need a browser that supports WebGPU');
		}

		const context = options.canvas.getContext('webgpu');
		if (context == null) {
			window.alert('cannot get webgpu context');
			throw new Error('cannot get webgpu context');
		}

		this.renderer = new Renderer({
			gpuDevice: device,
			gpuContext: context,
			resolution,
			enableFloat32Filtering: this.enableFloat32Filtering,
			enableStats: this.enableStats,
			histogramCanvas: this.histogramCanvas,
			waveformCanvas: this.waveformCanvas,
		});

		this.renderer.updateAssets(this.assets);
		this.renderer.updateMacros(this.macros);
		this.renderer.updateAutomations(this.automations);
		this.renderer.updateNodes(this.nodes, this.getReadyVideoElements());
	}

	public unsetCanvas() {
		if (this.renderer != null) {
			this.renderer.destroy();
			this.renderer = null;
		}
	}

	public render(timeStamp: number, renderNodeId: string | null) {
		if (this.renderer == null) return;
		if (this.nodes.length === 0) return;

		this.renderer.render(renderNodeId ?? this.nodes.at(-1)!.id, {
			time: timeStamp,
		});

		this.fpsDisplay.value = this.renderer.fpsAverage.get();

		if (this.enableStats) {
			this.gpuAverageDisplayFast.value = this.renderer.gpuAverageFast.get();
			this.gpuAverageDisplayMedium.value = this.renderer.gpuAverageMedium.get();
			this.gpuAverageDisplaySlow.value = this.renderer.gpuAverageSlow.get();
		}
	}

	public startRenderLoop() {
		let then = 0;
		const interval = 1000 / (this.fpsLimit ?? 30);

		const renderLoop = (timeStamp: number) => {
			this.currentRafId = window.requestAnimationFrame(renderLoop);

			if (this.fpsLimit != null) {
				const delta = timeStamp - then;
				if (delta <= interval) return;
				then = timeStamp - (delta % interval);
			}

			this.render(timeStamp, null);
		};

		this.currentRafId = window.requestAnimationFrame(renderLoop);
	}

	public stopRenderLoop() {
		if (this.currentRafId != null) {
			window.cancelAnimationFrame(this.currentRafId);
			this.currentRafId = null;
		}
	}

	public async updateNodes(newNodes: GsNode[]) {
		const oldFxNodes = getFxNodes(this.nodes);
		const newFxNodes = getFxNodes(newNodes);
		const nodes = deepClone(newNodes);
		this.nodes = nodes;

		for (const [id, video] of this.videoElements) {
			const oldNode = oldFxNodes.find(node => node.id === id);
			const newNode = newFxNodes.find(node => node.id === id);
			if (newNode?.fx !== 'video' || oldNode?.params.video.value !== newNode.params.video.value) {
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
				const asset = this.assets.find(asset => asset.id === node.params.video.value);
				if (!asset?.fileDataType.startsWith('video/')) continue;
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
				video.src = URL.createObjectURL(asset.fileData);
			}
		}

		await Promise.all(this.videoLoads.values());
		if (this.nodes !== nodes) return;
		this.renderer?.updateNodes(this.nodes, this.getReadyVideoElements());
	}

	private getReadyVideoElements(): Map<GsFxNode['id'], HTMLVideoElement> {
		return new Map([...this.videoElements].filter(([, video]) => isVideoFrameAvailable(video)));
	}

	public getVideoElement(nodeId: GsFxNode['id']): HTMLVideoElement | null {
		return this.videoElements.get(nodeId) ?? null;
	}

	public updateMacros(newMacros: Macro[]) {
		this.macros = deepClone(newMacros);
		this.renderer?.updateMacros(this.macros);
	}

	public updateAutomations(newAutomations: GsAutomation[]) {
		this.automations = deepClone(newAutomations);
		this.renderer?.updateAutomations(this.automations);
	}

	public async updateAssets(newAssets: Asset[]) {
		this.assets = deepClone(newAssets);
		this.renderer?.updateAssets(this.assets);
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
}
