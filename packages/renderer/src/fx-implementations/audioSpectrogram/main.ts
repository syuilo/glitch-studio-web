import { implementEffect } from '../../fx-implementation.ts';
import { createAudioSpectrogram } from '../../audio-spectrogram.ts';
import type definition from '@glitch/shared/fx-definitions/audioSpectrogram.ts';

export default implementEffect<typeof definition>({
	disableCache: true,
	getOut: ({ wgpu, resolution }) => wgpu.device.createTexture({
		size: resolution, format: navigator.gpu.getPreferredCanvasFormat(),
		usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
	}),
	init: ({ wgpu: { device, defaultVertexShaderModule } }) => {
		const spectrogram = createAudioSpectrogram(device, defaultVertexShaderModule);
		return {
			render(ctx) {
				const pass = ctx.createPassEncoder(ctx.commandEncoder);
				spectrogram.render(ctx.params.player?.audio ?? null, ctx.params, pass);
				pass.end();
			},
			dispose: () => spectrogram.dispose(),
		};
	},
});
