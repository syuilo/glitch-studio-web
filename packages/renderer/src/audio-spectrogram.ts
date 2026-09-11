import { AudioSpectrum, audioChannel, finiteNumber } from './audio-spectrum.ts';
import type { AudioHistory } from './audio-history.ts';
import type { SpectrogramSettings } from '@glitch/shared/utility/audio-spectrogram.ts';
import shader from './audio-spectrogram.wgsl?raw';

// 入力音声と描画先は呼び出し側が決める。Playerやエフェクトの定義には依存しない。
export function createAudioSpectrogram(device: GPUDevice, defaultVertexShaderModule: GPUShaderModule) {
	const bands = 512;
	const module = device.createShaderModule({ code: shader });
	// r32floatをtextureLoadで読むため、float32-filterable機能を要求しない。
	const layout = device.createBindGroupLayout({ entries: [
		{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
		{ binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } },
	] });
	const pipeline = device.createRenderPipeline({
		layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
		vertex: { module: defaultVertexShaderModule },
		fragment: { module, targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }] },
		primitive: { topology: 'triangle-list' },
	});
	const uniformBuffer = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
	const uniforms = new Float32Array(12);
	const rows = [new Float32Array(bands), new Float32Array(bands)];
	let texture: GPUTexture | null = null;
	let bindGroup: GPUBindGroup | null = null;
	let capacity = 0;
	let spectrum: AudioSpectrum | null = null;
	let source: AudioHistory | null = null;
	let revision = -1;
	let settings = '';
	let newestBucket = -1;
	let filled = 0;
	return {
		render(audio: AudioHistory | null, p: SpectrogramSettings, pass: GPURenderPassEncoder) {
			const rate = audio?.sampleRate ?? 48000;
			const size = 2 ** Math.round(Math.log2(finiteNumber(p.fftSize, 2048, 256, 32768)));
			const duration = finiteNumber(p.duration, 10, 0.5, 60);
			const channel = audioChannel(p.channel);
			const smoothing = finiteNumber(p.smoothing, 0, 0, 2);
			const minFrequency = finiteNumber(p.minFrequency, 20, p.logarithmic ? 1 : 0, rate / 2 - 1);
			const maxFrequency = finiteNumber(p.maxFrequency, 20000, minFrequency + 1, rate / 2);
			const hop = size / 4;
			// 長い表示期間でもGPU履歴は最大4096行。複数FFTが同じ行に入る場合はピークを保持する。
			const maxRows = Math.min(4096, device.limits.maxTextureDimension2D);
			const step = hop * Math.max(1, Math.ceil(duration * rate / hop / (maxRows - 2)));
			const required = Math.ceil(duration * rate / step) + 2;
			if (capacity !== required) {
				texture?.destroy();
				capacity = required;
				texture = device.createTexture({ size: [bands, capacity, 2], format: 'r32float',
					usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
				bindGroup = device.createBindGroup({ layout, entries: [
					{ binding: 0, resource: { buffer: uniformBuffer } },
					{ binding: 1, resource: texture.createView({ dimension: '2d-array' }) },
				] });
			}
			const key = JSON.stringify([size, p.window, channel, smoothing, duration, rate, minFrequency, maxFrequency, p.logarithmic]);
			if (key !== settings || source !== audio || revision !== (audio?.revision ?? -1)) {
				spectrum = new AudioSpectrum(size, p.window);
				settings = key;
				source = audio;
				revision = audio?.revision ?? -1;
				newestBucket = -1;
				filled = 0;
			}
			spectrum!.update(audio, channel, smoothing, (endFrame, reset) => {
				const bucket = Math.floor(endFrame / step);
				if (reset) { newestBucket = -1; filled = 0; }
				if (bucket !== newestBucket) {
					// 欠落した時刻の行を古いテクスチャで埋めない。
					filled = bucket === newestBucket + 1 ? Math.min(capacity, filled + 1) : 1;
					newestBucket = bucket;
					rows[0].fill(0);
					rows[1].fill(0);
				}
				const frequency = (x: number) => p.logarithmic
					? minFrequency * (maxFrequency / minFrequency) ** x
					: minFrequency + (maxFrequency - minFrequency) * x;
				for (let side = 0; side < (channel === 'stereo' ? 2 : 1); side++) {
					const values = side === 0 ? spectrum!.left : spectrum!.right;
					for (let band = 0; band < bands; band++) {
						const from = frequency(band / bands) * size / rate;
						const to = frequency((band + 1) / bands) * size / rate;
						let amplitude = 0;
						if (to - from < 1) {
							const position = (from + to) * 0.5;
							const index = Math.floor(position);
							amplitude = values[index] * (1 - (position - index)) + values[Math.min(index + 1, size / 2)] * (position - index);
						} else {
							for (let bin = Math.ceil(from); bin <= Math.min(size / 2, Math.floor(to)); bin++) amplitude = Math.max(amplitude, values[bin]);
						}
						rows[side][band] = Math.max(rows[side][band], amplitude);
					}
					device.queue.writeTexture({ texture: texture!, origin: [0, bucket % capacity, side] }, rows[side],
						{ bytesPerRow: bands * 4 }, [bands, 1, 1]);
				}
			});
			if (!spectrum!.hasData) filled = 0;
			const minDb = finiteNumber(p.minDb, -80, -120, -1);
			const maxDb = finiteNumber(p.maxDb, 0, minDb + 1, 20);
			uniforms.set([Math.max(0, newestBucket) % capacity, filled, duration * rate / step,
				filled ? Math.max(0, (audio!.endFrame - newestBucket * step) / step) : 0,
				Number(p.orientation !== 'vertical'), Number(p.direction === 'reverse'), Number(p.flipFrequency), Number(channel === 'stereo'),
				minDb, maxDb, 0, 0]);
			device.queue.writeBuffer(uniformBuffer, 0, uniforms);
			pass.setPipeline(pipeline);
			pass.setBindGroup(0, bindGroup!);
			pass.draw(6);
		},
		dispose() { texture?.destroy(); uniformBuffer.destroy(); },
	};
}
