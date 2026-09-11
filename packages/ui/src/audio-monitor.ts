// プレビュー専用の設定。FFTの窓はAnalyserNode標準のBlackman窓。
export const AUDIO_MONITOR_SETTINGS = {
	fftSize: 4096,
	waveformSize: 32768,
	smoothingTimeConstant: 0.75,
	minDecibels: -90,
	maxDecibels: 0,
	minFrequency: 20,
	maxFrequency: 20000,
	waveformSeconds: 0.04,
	framesPerSecond: 60,
	leftColor: '#48d8ed',
	rightColor: '#f77da9',
};

export class AudioMonitor {
	private splitter: ChannelSplitterNode;
	private analysers: AnalyserNode[];
	private waveformAnalysers: AnalyserNode[];
	public readonly waveform = [new Float32Array(AUDIO_MONITOR_SETTINGS.waveformSize), new Float32Array(AUDIO_MONITOR_SETTINGS.waveformSize)];
	public readonly spectrum = [new Float32Array(AUDIO_MONITOR_SETTINGS.fftSize / 2), new Float32Array(AUDIO_MONITOR_SETTINGS.fftSize / 2)];
	private lastRead = -Infinity;

	constructor(private context: AudioContext, private input: AudioNode) {
		this.splitter = context.createChannelSplitter(2);
		this.analysers = [0, 1].map(channel => {
			const analyser = new AnalyserNode(context, {
				fftSize: AUDIO_MONITOR_SETTINGS.fftSize,
				smoothingTimeConstant: AUDIO_MONITOR_SETTINGS.smoothingTimeConstant,
				minDecibels: AUDIO_MONITOR_SETTINGS.minDecibels,
				maxDecibels: AUDIO_MONITOR_SETTINGS.maxDecibels,
			});
			this.splitter.connect(analyser, channel);
			return analyser;
		});
		// 波形の表示時間を広げてもスペクトラムの時間・周波数分解能が変わらないように分ける。
		this.waveformAnalysers = [0, 1].map(channel => {
			const analyser = new AnalyserNode(context, { fftSize: AUDIO_MONITOR_SETTINGS.waveformSize });
			this.splitter.connect(analyser, channel);
			return analyser;
		});
		input.connect(this.splitter);
	}

	public get sampleRate() { return this.context.sampleRate; }

	public read() {
		const now = performance.now();
		// 複数のパネルがあっても同じ取得結果を共有する。
		if (now - this.lastRead < 1000 / AUDIO_MONITOR_SETTINGS.framesPerSecond) return this;
		this.lastRead = now;
		for (let channel = 0; channel < 2; channel++) {
			if (this.context.state === 'running') {
				this.waveformAnalysers[channel].getFloatTimeDomainData(this.waveform[channel]);
				this.analysers[channel].getFloatFrequencyData(this.spectrum[channel]);
			} else {
				this.waveform[channel].fill(0);
				this.spectrum[channel].fill(-Infinity);
			}
		}
		return this;
	}

	public dispose() {
		this.input.disconnect(this.splitter);
		this.splitter.disconnect();
		for (const analyser of this.analysers) analyser.disconnect();
		for (const analyser of this.waveformAnalysers) analyser.disconnect();
	}
}
