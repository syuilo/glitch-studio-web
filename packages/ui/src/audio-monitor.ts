// プレビュー専用の設定。FFTの窓はAnalyserNode標準のBlackman窓。
export const AUDIO_MONITOR_SETTINGS = {
	fftSize: 4096,
	waveformSize: 32768,
	// 従来の60Hz更新・平滑化係数0.75に相当する時定数（秒）。
	smoothingSeconds: -1 / (60 * Math.log(0.75)),
	minDecibels: -90,
	maxDecibels: 0,
	minFrequency: 20,
	maxFrequency: 20000,
	waveformSeconds: 0.04,
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
				smoothingTimeConstant: 0,
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
		const now = this.context.currentTime;
		// 同じ音声処理時刻の取得結果は、別ウィンドウを含む複数のパネルで共有する。
		if (this.context.state === 'running' && now === this.lastRead) return this;
		// 更新頻度によらず同じ時間で減衰するよう、経過秒数から平滑化係数を求める。
		const smoothing = Math.exp(-(now - this.lastRead) / AUDIO_MONITOR_SETTINGS.smoothingSeconds);
		this.lastRead = this.context.state === 'running' ? now : -Infinity;
		for (let channel = 0; channel < 2; channel++) {
			if (this.context.state === 'running') {
				this.waveformAnalysers[channel].getFloatTimeDomainData(this.waveform[channel]);
				this.analysers[channel].smoothingTimeConstant = smoothing;
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
