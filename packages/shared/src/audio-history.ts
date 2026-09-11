import type { AudioChunk } from './audio.ts';

export class AudioHistory {
	public sampleRate = 48000;
	public channelCount = 0;
	public generation = 0;
	public revision = 0;
	public startFrame = 0;
	public endFrame = 0;
	private capacity = 0;
	private channels: Float32Array[] = [];

	public reset(generation = this.generation) {
		this.generation = generation;
		this.revision++;
		this.startFrame = this.endFrame = 0;
		this.channelCount = 0;
	}

	public append(chunk: AudioChunk) {
		if (chunk.generation < this.generation) return;
		if (chunk.generation !== this.generation || chunk.startFrame !== this.endFrame
			|| chunk.sampleRate !== this.sampleRate || chunk.channelCount !== this.channelCount) {
			this.reset(chunk.generation);
			this.startFrame = this.endFrame = chunk.startFrame;
		}
		this.sampleRate = chunk.sampleRate;
		this.channelCount = chunk.channelCount;
		// 最大1秒の波形・32768点FFTと、描画が一時的に遅れた分を保持する。
		const capacity = Math.max(65536, Math.ceil(this.sampleRate * 2));
		if (capacity !== this.capacity) {
			this.capacity = capacity;
			this.channels = [new Float32Array(capacity), new Float32Array(capacity)];
		}
		const samples = new Float32Array(chunk.buffer);
		for (let channel = 0; channel < 2; channel++) {
			for (let i = 0; i < chunk.frameCount; i++) {
				this.channels[channel][(chunk.startFrame + i) % capacity] = channel < chunk.channelCount
					? samples[channel * chunk.frameCount + i] : 0;
			}
		}
		this.endFrame = chunk.startFrame + chunk.frameCount;
		this.startFrame = Math.max(this.startFrame, this.endFrame - capacity);
	}

	public sample(frame: number, channel: 'left' | 'right' | 'mix'): number {
		if (frame < this.startFrame || frame >= this.endFrame || !this.channelCount) return 0;
		const index = frame % this.capacity;
		if (channel === 'right') return this.channels[1][index];
		if (channel === 'mix' && this.channelCount > 1) return (this.channels[0][index] + this.channels[1][index]) * 0.5;
		return this.channels[0][index];
	}
}
