import { GsNode, Renderer } from "./renderer.ts";
import { ref } from "vue";

export class Engine {
	public renderer: Renderer | null = null;
	private enableFloat32Filtering: boolean = false;
	private enableStats: boolean = true;
	private nodes: GsNode[] = [];
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
			//powerPreference: 'low-power',
		});

		const _device = await adapter?.requestDevice({
			requiredFeatures: [
				...(this.enableFloat32Filtering ? ['float32-filterable'] as const : []),
				...(this.enableStats ? ['timestamp-query'] as const : []),
			],
		});
		if (!_device) {
			window.alert('need a browser that supports WebGPU');
			throw new Error('need a browser that supports WebGPU');
		}

		this.renderer = new Renderer({
			gpuDevice: _device,
			canvas: options.canvas,
			resolution: options.resolution,
			enableFloat32Filtering: this.enableFloat32Filtering,
			enableStats: this.enableStats,
		});
	}

	public render(timeStamp: number, renderNodeId: string | null, args: {
		mouseX?: number;
		mouseY?: number;
		frame?: number;
	}) {
		if (this.renderer == null) return;

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

			this.render(timeStamp);
		};

		window.requestAnimationFrame(renderLoop);
	}

	public updateNodes(newNodes: GsNode[]) {
		this.renderer?.updateNodes(newNodes);
		this.nodes = newNodes;
	}
}
