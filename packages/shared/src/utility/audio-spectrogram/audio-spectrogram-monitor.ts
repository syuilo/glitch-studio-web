import { createAudioSpectrogram } from './audio-spectrogram.ts';
import type { AudioSpectrogramOptions } from '@glitch/shared/utility/audio-spectrogram.ts';
import type { AudioHistory } from '../../audio-history.ts';

export class AudioSpectrogramMonitor {
	private context: GPUCanvasContext;
	private spectrogram: ReturnType<typeof createAudioSpectrogram>;

	constructor(private canvas: OffscreenCanvas, public options: AudioSpectrogramOptions,
		private device: GPUDevice, defaultVertexShaderModule: GPUShaderModule) {
		this.context = canvas.getContext('webgpu')!;
		this.context.configure({ device, format: navigator.gpu.getPreferredCanvasFormat(), alphaMode: 'opaque' });
		this.spectrogram = createAudioSpectrogram(device, defaultVertexShaderModule);
	}

	public resize(width: number, height: number) {
		const limit = this.device.limits.maxTextureDimension2D;
		this.canvas.width = Math.max(1, Math.min(limit, width));
		this.canvas.height = Math.max(1, Math.min(limit, height));
	}

	public render(audio: AudioHistory | null) {
		const commandEncoder = this.device.createCommandEncoder();
		const pass = commandEncoder.beginRenderPass({
			colorAttachments: [{
				view: this.context.getCurrentTexture().createView(),
				loadOp: 'clear',
				storeOp: 'store',
				clearValue: [0, 0, 0, 1],
			}],
		});
		this.spectrogram.render(audio, this.options, pass);
		pass.end();
		this.device.queue.submit([commandEncoder.finish()]);
	}

	public dispose() {
		this.spectrogram.dispose();
		this.context.unconfigure();
	}
}
