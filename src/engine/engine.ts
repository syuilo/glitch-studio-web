import { Asset, Macro } from "@/types.ts";
import { GsFxNode, GsNode, Renderer } from "./renderer.ts";
import { ref } from "vue";
import { GsAutomation } from "./types.ts";
import { deepClone } from "@/utility/deep-clone.ts";
import { playVideoAfterFirstFrameIsReady } from "@/utility/video.ts";

export class Engine {
	private renderer: Renderer | null = null;
	private enableFloat32Filtering: boolean = false;
	private enableStats: boolean = true;
	private nodes: GsNode[] = [];
	private assets: Asset[] = [];
	private macros: Macro[] = [];
	private automations: GsAutomation[] = [];
	private histogramCanvas: HTMLCanvasElement | null = null;
	private waveformCanvas: HTMLCanvasElement | null = null;
	private videoElements: Map<GsFxNode['id'], HTMLVideoElement> = new Map();
	public fps: number | null = 60;
	public gpuAverageDisplayFast = ref(0);
	public gpuAverageDisplayMedium = ref(0);
	public gpuAverageDisplaySlow = ref(0);

	constructor() {
	}
	
	async init(options: {
		canvas: HTMLCanvasElement;
		resolution: {
			width: number;
			height: number;
		};
	}) {
		if (this.renderer != null) {
			this.renderer.destroy();
		}

		options.canvas.width = options.resolution.width;
		options.canvas.height = options.resolution.height;

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
			resolution: options.resolution,
			enableFloat32Filtering: this.enableFloat32Filtering,
			enableStats: this.enableStats,
			histogramCanvas: this.histogramCanvas,
			waveformCanvas: this.waveformCanvas,
			nodes: this.nodes,
			assets: this.assets,
			macros: this.macros,
			automations: this.automations,
		});
	}

	public render(timeStamp: number, renderNodeId: string | null, args: {
		mouseX?: number;
		mouseY?: number;
		frame?: number;
	}) {
		if (this.renderer == null) return;
		if (this.nodes.length === 0) return;

		this.renderer.render(renderNodeId ?? this.nodes.at(-1).id, args);

		if (this.enableStats) {
			this.gpuAverageDisplayFast.value = this.renderer.gpuAverageFast.get();
			this.gpuAverageDisplayMedium.value = this.renderer.gpuAverageMedium.get();
			this.gpuAverageDisplaySlow.value = this.renderer.gpuAverageSlow.get();
		}
	}

	public startRenderLoop() {
		let then = 0;
		const interval = 1000 / (this.fps ?? 30);

		const renderLoop = (timeStamp: number) => {
			window.requestAnimationFrame(renderLoop);

			if (this.fps != null) {
				const delta = timeStamp - then;
				if (delta <= interval) return;
				then = timeStamp - (delta % interval);
			}

			this.render(timeStamp, null);
		};

		window.requestAnimationFrame(renderLoop);
	}

	public async updateNodes(newNodes: GsNode[]) {
		const addedNodes = newNodes.filter(node => !this.nodes.some(n => n.id === node.id));
		const removedNodes = this.nodes.filter(n => !newNodes.some(node => node.id === n.id));

		for (const node of removedNodes) {
			if (this.videoElements.has(node.id)) {
				const video = this.videoElements.get(node.id);
				video?.pause();
				this.videoElements.delete(node.id);
				URL.revokeObjectURL(video?.src);
			}
		}

		for (const node of addedNodes) {
			if (node.type === 'fx' && node.fx === 'video' && !this.videoElements.has(node.id)) {
				const asset = this.assets.find(asset => asset.id === node.params.video.value);
				const video = document.createElement('video');
				video.src = URL.createObjectURL(new Blob([asset.fileData], { type: asset.fileDataType }));
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
}
