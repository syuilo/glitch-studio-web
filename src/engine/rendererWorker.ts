import { Renderer } from './renderer.ts';

let renderer: Renderer | null = null;
let canvas: OffscreenCanvas | null = null;
let histogramCanvas: OffscreenCanvas | null = null;
let waveformCanvas: OffscreenCanvas | null = null;

onmessage = async (event) => {
	//console.log('Worker received message:', event.data);

	switch (event.data?.type) {
		case 'init': {
			canvas = event.data.canvas as OffscreenCanvas;
			histogramCanvas = event.data.histogramCanvas as OffscreenCanvas;
			waveformCanvas = event.data.waveformCanvas as OffscreenCanvas;

			const adapter = await navigator.gpu?.requestAdapter({
				powerPreference: 'high-performance',
			});

			const device = await adapter?.requestDevice({
				requiredFeatures: [
					...(event.data.options.enableFloat32Filtering ? ['float32-filterable'] as const : []),
					...(event.data.options.enableStats ? ['timestamp-query'] as const : []),
				],
			});
			if (device == null) {
				//window.alert('need a browser that supports WebGPU');
				throw new Error('need a browser that supports WebGPU');
			}

			const context = canvas.getContext('webgpu');
			const histogramContext = histogramCanvas.getContext('webgpu');
			const waveformContext = waveformCanvas.getContext('webgpu');
			if (context == null || histogramContext == null || waveformContext == null) {
				//window.alert('cannot get webgpu context');
				throw new Error('cannot get webgpu context');
			}

			renderer = new Renderer({
				gpuDevice: device,
				gpuContext: context,
				resolution: event.data.options.resolution,
				enableFloat32Filtering: event.data.options.enableFloat32Filtering,
				enableStats: event.data.options.enableStats,
				assets: event.data.options.assets,
				macros: event.data.options.macros,
				automations: event.data.options.automations,
				nodes: event.data.options.nodes,
				histogramGpuContext: histogramContext,
				waveformGpuContext: waveformContext,
			});

			//renderer.on('ev', ({ type, ctx }) => {
			//	self.postMessage({ type: 'ev', ev: { type, ctx } });
			//});

			//await renderer.init();

			self.postMessage({ type: 'inited' });
			break;
		}
		case 'resize': {
			canvas.width = event.data.resolution.width;
			canvas.height = event.data.resolution.height;
			if (renderer != null) renderer.resize(event.data.resolution);
			break;
		}
		case 'videoFrame': {
			const { nodeId, id, frame } = event.data;
			try {
				if (renderer) {
					renderer.updateVideoFrame(nodeId, frame);
				} else {
					frame.close();
				}
			} finally {
				self.postMessage({ type: 'videoFrameReceived', nodeId, id });
			}
			break;
		}
		case 'call': {
			if (renderer == null) {
				console.error('Failed to call: Renderer is not initialized yet!!!');
				break;
			}
			const res = renderer[event.data.fn](...(event.data.args ?? []));
			if (event.data.needReturnValue) {
				if (res instanceof Promise) {
					res.then((r) => {
						self.postMessage({ type: 'return', id: event.data.id, value: r });
					});
				} else {
					self.postMessage({ type: 'return', id: event.data.id, value: res });
				}
			}
			break;
		}
		default: {
			console.warn('Unrecognized message type:', event.data?.type);
		}
	}
};
