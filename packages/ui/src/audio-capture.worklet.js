// 音声スレッドではFFTや待機を行わない。転送バッファが尽きた場合は可視化だけを欠落させる。
class AudioCaptureProcessor extends AudioWorkletProcessor {
	constructor() {
		super();
		this.stream = null;
		this.pool = [];
		this.samples = null;
		this.offset = 0;
		this.startFrame = 0;
		this.channelCount = 0;
		this.generation = 0;
		this.active = false;
		this.disposed = false;
		this.port.onmessage = ({ data }) => {
			if (data.type === 'dispose') {
				this.disposed = true;
				this.stream?.close();
				this.samples = null;
				this.pool = [];
				return;
			}
			if (data.type === 'connect') {
				this.stream = data.port;
				this.stream.onmessage = ({ data: returned }) => {
					if (returned.type === 'recycle') this.pool.push(new Float32Array(returned.buffer));
				};
				for (let i = 0; i < 8; i++) this.pool.push(new Float32Array(2048));
			}
			if (data.type === 'state') {
				this.active = data.active;
				this.offset = 0;
				if (this.samples) this.pool.push(this.samples);
				this.samples = null;
				if (this.generation !== data.generation) {
					this.generation = data.generation;
					this.stream?.postMessage({ type: 'reset', generation: this.generation });
				}
			}
		};
	}

	process(inputs) {
		if (this.disposed) return false;
		const channels = inputs[0];
		if (!this.active || !this.stream || !channels?.length) {
			this.offset = 0;
			return true;
		}
		const count = Math.min(2, channels.length);
		if (count !== this.channelCount) {
			this.channelCount = count;
			this.offset = 0;
		}
		// レンダークォンタムの長さを128に固定しない。
		for (let i = 0; i < channels[0].length; i++) {
			if (!this.samples) {
				this.samples = this.pool.pop();
				if (!this.samples) break;
			}
			if (this.offset === 0) this.startFrame = currentFrame + i;
			this.samples[this.offset] = channels[0][i];
			this.samples[1024 + this.offset] = count > 1 ? channels[1][i] : 0;
			this.offset++;
			if (this.offset === 1024) {
				const buffer = this.samples.buffer;
				this.stream.postMessage({ type: 'samples', generation: this.generation,
					startFrame: this.startFrame, sampleRate, channelCount: count, frameCount: 1024, buffer }, [buffer]);
				this.samples = null;
				this.offset = 0;
			}
		}
		// 出力は無音。実際の再生経路はこのWorkletを経由させない。
		return true;
	}
}

registerProcessor('glitch-audio-capture', AudioCaptureProcessor);
