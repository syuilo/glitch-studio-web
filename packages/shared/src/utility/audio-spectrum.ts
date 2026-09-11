import type { AudioHistory } from '../audio-history.ts';

export type AudioChannel = 'left' | 'right' | 'mix' | 'stereo';

export function finiteNumber(value: number, fallback: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export function audioChannel(value: string): AudioChannel {
	return value === 'right' || value === 'mix' || value === 'stereo' ? value : 'left';
}

export class AudioSpectrum {
	public left: Float32Array;
	public right: Float32Array;
	public hasData = false;
	private real: Float64Array;
	private imaginary: Float64Array;
	private window: Float64Array;
	private reverse: Uint32Array;
	private cosine: Float64Array;
	private sine: Float64Array;
	private windowSum = 0;
	private history: AudioHistory | null = null;
	private revision = -1;
	private nextEndFrame = 0;
	private channel: AudioChannel = 'left';

	constructor(public readonly size: number, public readonly windowName: string) {
		this.left = new Float32Array(size / 2 + 1);
		this.right = new Float32Array(size / 2 + 1);
		this.real = new Float64Array(size);
		this.imaginary = new Float64Array(size);
		this.window = new Float64Array(size);
		this.reverse = new Uint32Array(size);
		this.cosine = new Float64Array(size / 2);
		this.sine = new Float64Array(size / 2);
		const bits = Math.log2(size);
		for (let i = 0; i < size; i++) {
			let reversed = 0;
			for (let bit = 0; bit < bits; bit++) reversed = (reversed << 1) | ((i >> bit) & 1);
			this.reverse[i] = reversed;
			// FFT区間の周期窓。窓の総和で振幅を正規化する。
			const phase = 2 * Math.PI * i / size;
			const weight = windowName === 'hann' ? 0.5 - 0.5 * Math.cos(phase)
				: windowName === 'hamming' ? 0.54 - 0.46 * Math.cos(phase)
				: windowName === 'blackman' ? 0.42 - 0.5 * Math.cos(phase) + 0.08 * Math.cos(2 * phase) : 1;
			this.window[i] = weight;
			this.windowSum += weight;
			if (i < size / 2) {
				this.cosine[i] = Math.cos(phase);
				this.sine[i] = -Math.sin(phase);
			}
		}
	}

	private transform(history: AudioHistory, endFrame: number, channel: 'left' | 'right' | 'mix', output: Float32Array, alpha: number) {
		const n = this.size;
		for (let i = 0; i < n; i++) {
			this.real[this.reverse[i]] = history.sample(endFrame - n + i, channel) * this.window[i];
			this.imaginary[i] = 0;
		}
		// in-place radix-2 FFT。作業領域は左右チャンネルで使い回す。
		for (let length = 2; length <= n; length *= 2) {
			const half = length / 2;
			const stride = n / length;
			for (let start = 0; start < n; start += length) {
				for (let j = 0; j < half; j++) {
					const even = start + j;
					const odd = even + half;
					const cosine = this.cosine[j * stride];
					const sine = this.sine[j * stride];
					const real = this.real[odd] * cosine - this.imaginary[odd] * sine;
					const imaginary = this.real[odd] * sine + this.imaginary[odd] * cosine;
					this.real[odd] = this.real[even] - real;
					this.imaginary[odd] = this.imaginary[even] - imaginary;
					this.real[even] += real;
					this.imaginary[even] += imaginary;
				}
			}
		}
		for (let i = 0; i < output.length; i++) {
			// 片側振幅スペクトラム。DCとNyquistは二倍にしない。
			const scale = (i === 0 || i === n / 2 ? 1 : 2) / this.windowSum;
			const amplitude = Math.hypot(this.real[i], this.imaginary[i]) * scale;
			output[i] = output[i] * alpha + amplitude * (1 - alpha);
		}
	}

	public update(history: AudioHistory | null, channel: AudioChannel, smoothing: number,
		onFrame?: (endFrame: number, reset: boolean) => void) {
		const hop = this.size / 4;
		if (this.history !== history || this.revision !== history?.revision || this.channel !== channel
			|| (history && this.nextEndFrame - this.size < history.startFrame)) {
			this.left.fill(0);
			this.right.fill(0);
			this.hasData = false;
			this.history = history;
			this.revision = history?.revision ?? -1;
			this.channel = channel;
			this.nextEndFrame = (history?.startFrame ?? 0) + this.size;
		}
		if (!history?.channelCount) return;
		// 長時間停止した描画の追いつきで音声履歴を無制限に解析しない。
		const pending = Math.floor((history.endFrame - this.nextEndFrame) / hop) + 1;
		if (pending > 128) {
			this.nextEndFrame += (pending - 128) * hop;
			this.left.fill(0);
			this.right.fill(0);
			this.hasData = false;
		}
		// 描画fpsではなく、解析するサンプル間隔に基づく時定数。
		const alpha = smoothing > 0 ? Math.exp(-hop / history.sampleRate / smoothing) : 0;
		while (this.nextEndFrame <= history.endFrame) {
			this.transform(history, this.nextEndFrame, channel === 'stereo' ? 'left' : channel, this.left, alpha);
			if (channel === 'stereo') this.transform(history, this.nextEndFrame, 'right', this.right, alpha);
			// 各解析区間を通知し、低fpsでも途中のスペクトラムを履歴へ残せるようにする。
			onFrame?.(this.nextEndFrame, !this.hasData);
			this.nextEndFrame += hop;
			this.hasData = true;
		}
	}
}
