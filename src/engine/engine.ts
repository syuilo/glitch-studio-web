import { Asset, Macro } from "@/types.ts";
import { GsNode, Renderer } from "./renderer.ts";
import { ref } from "vue";
import { GsAutomation } from "./types.ts";

export class Engine {
	private renderer: Renderer | null = null;
	private enableFloat32Filtering: boolean = false;
	private enableStats: boolean = true;
	private nodes: GsNode[] = [];
	private assets: Asset[] = [];
	private macros: Macro[] = [];
	private automations: GsAutomation[] = [];
	private histogramCanvas: HTMLCanvasElement | null = null;
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

		const adapter = await navigator.gpu?.requestAdapter({
			powerPreference: 'high-performance',
		});

		const device = await adapter?.requestDevice({
			requiredFeatures: [
				...(this.enableFloat32Filtering ? ['float32-filterable'] as const : []),
				...(this.enableStats ? ['timestamp-query'] as const : []),
			],
		});
		if (!device) {
			window.alert('need a browser that supports WebGPU');
			throw new Error('need a browser that supports WebGPU');
		}

		this.renderer = new Renderer({
			gpuDevice: device,
			canvas: options.canvas,
			resolution: options.resolution,
			enableFloat32Filtering: this.enableFloat32Filtering,
			enableStats: this.enableStats,
			histogramCanvas: this.histogramCanvas,
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

	public updateNodes(newNodes: GsNode[]) {
		this.nodes = newNodes;
		this.renderer?.updateNodes(this.nodes);
	}

	public updateMacros(newMacros: any[]) {
		this.macros = newMacros;
		this.renderer?.updateMacros(this.macros);
	}

	public updateAutomations(newAutomations: any[]) {
		this.automations = newAutomations;
		this.renderer?.updateAutomations(this.automations);
	}

	public updateAssets(newAssets: any[]) {
		this.assets = newAssets;
		this.renderer?.updateAssets(this.assets);
	}

	public setHistogramCanvas(canvas: HTMLCanvasElement | null) {
		this.histogramCanvas = canvas;
		this.renderer?.setHistogramCanvas(canvas);
	}
}
