import { ref } from 'vue';
import { getFxNodes, GsFxNode, GsNode, Renderer } from './renderer.ts';
import { GsAutomation } from './types.ts';
import { Asset, Macro } from '@/types.ts';
import { deepClone } from '@/utility/deep-clone.ts';
import { playVideoAfterFirstFrameIsReady } from '@/utility/video.ts';
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
	private videoElements: Map<GsFxNode['id'], HTMLVideoElement> = new Map();
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
		this.renderer.updateNodes(this.nodes, this.videoElements);
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
		const oldNodeIds = new Set(oldFxNodes.map(node => node.id));
		const newNodeIds = new Set(newFxNodes.map(node => node.id));
		const addedNodes = newFxNodes.filter(node => !oldNodeIds.has(node.id));
		const removedNodes = oldFxNodes.filter(node => !newNodeIds.has(node.id));

		for (const node of removedNodes) {
			if (this.videoElements.has(node.id)) {
				const video = this.videoElements.get(node.id)!;
				video.pause();
				this.videoElements.delete(node.id);
				URL.revokeObjectURL(video.src);
			}
		}

		for (const node of addedNodes) {
			if (node.fx === 'video' && !this.videoElements.has(node.id)) {
				const asset = this.assets.find(asset => asset.id === node.params.video.value)!;
				const video = window.document.createElement('video');
				video.src = URL.createObjectURL(asset.fileData);
				video.loop = true;
				this.videoElements.set(node.id, video);
				await playVideoAfterFirstFrameIsReady(video);
			}
		}

		// TODO: video nodeが追加も削除もされずにassetだけ更新された場合の処理

		this.nodes = deepClone(newNodes);
		this.renderer?.updateNodes(this.nodes, this.videoElements);
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
