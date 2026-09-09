import { Renderer } from './renderer.ts';

let renderer: Renderer | null = null;
let canvas: OffscreenCanvas | null = null;

onmessage = async (event) => {
	//console.log('Worker received message:', event.data);

	switch (event.data?.type) {
		case 'init': {
			canvas = event.data.canvas as OffscreenCanvas;

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
			if (context == null) {
				//window.alert('cannot get webgpu context');
				throw new Error('cannot get webgpu context');
			}

			renderer = new Renderer({
				gpuDevice: device,
				gpuContext: context,
				resolution: event.data.options.resolution,
				enableFloat32Filtering: event.data.options.enableFloat32Filtering,
				enableStats: event.data.options.enableStats,
				//histogramCanvas: this.histogramCanvas,
				//waveformCanvas: this.waveformCanvas,
			});

			//renderer.on('ev', ({ type, ctx }) => {
			//	self.postMessage({ type: 'ev', ev: { type, ctx } });
			//});

			//await renderer.init();

			self.postMessage({ type: 'inited' });
			break;
		}
		case 'resize': {
			canvas.width = event.data.width;
			canvas.height = event.data.height;
			if (renderer != null) renderer.resize();
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
