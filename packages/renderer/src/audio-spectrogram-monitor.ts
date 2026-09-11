import effect from './fx-implementations/audioSpectrogram/main.ts';
import type { AudioSpectrogramOptions } from '@glitch/shared/utility/audio-spectrogram.ts';
import type { AudioHistory } from './audio-history.ts';

// エフェクトと同じ解析・履歴・シェーダーを使い、表示先だけを独立させる。
export class AudioSpectrogramMonitor {
	private context: GPUCanvasContext;
	private instance: ReturnType<typeof effect.init>;
	private previousTime: number | null = null;

	constructor(private canvas: OffscreenCanvas, public options: AudioSpectrogramOptions,
		private device: GPUDevice, defaultVertexShaderModule: GPUShaderModule, fallbackTexture: GPUTexture,
		enableFloat32Filtering: boolean) {
		this.context = canvas.getContext('webgpu')!;
		this.context.configure({ device, format: navigator.gpu.getPreferredCanvasFormat(), alphaMode: 'opaque' });
		this.instance = effect.init({
			resolution: { width: canvas.width, height: canvas.height },
			wgpu: { device, context: this.context, defaultVertexShaderModule, enableFloat32Filtering },
			params: { ...options, player: null }, fallbackTexture,
		});
	}

	public resize(width: number, height: number) {
		const limit = this.device.limits.maxTextureDimension2D;
		this.canvas.width = Math.max(1, Math.min(limit, width));
		this.canvas.height = Math.max(1, Math.min(limit, height));
	}

	public render(time: number, audio: AudioHistory | null) {
		const commandEncoder = this.device.createCommandEncoder();
		this.instance.render({
			time: time / 1000, timeDelta: this.previousTime == null ? 0 : time - this.previousTime,
			pointerPosition: { x: 0, y: 0 }, pointerVector: { x: 0, y: 0 },
			commandEncoder,
			createPassEncoder: (encoder, descriptor) => encoder.beginRenderPass(descriptor ?? {
				colorAttachments: [{ view: this.context.getCurrentTexture().createView(),
					loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }],
			}),
			createComputePassEncoder: (encoder, descriptor) => encoder.beginComputePass(descriptor),
			params: { ...this.options, player: { videoFrame: null, audio } },
		});
		this.device.queue.submit([commandEncoder.finish()]);
		this.previousTime = time;
	}

	public dispose() {
		this.instance.dispose();
		this.context.unconfigure();
	}
}
