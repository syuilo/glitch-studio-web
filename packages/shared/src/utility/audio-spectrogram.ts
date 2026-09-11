// 共通描画処理の設定。エフェクトのパラメータスキーマとは独立して定義する。
export type SpectrogramSettings = {
	channel: 'left' | 'right' | 'mix' | 'stereo';
	fftSize: 256 | 512 | 1024 | 2048 | 4096 | 8192 | 16384 | 32768;
	window: 'hann' | 'hamming' | 'blackman' | 'rectangular';
	smoothing: number;
	minFrequency: number;
	maxFrequency: number;
	logarithmic: boolean;
	minDb: number;
	maxDb: number;
	duration: number;
	orientation: 'horizontal' | 'vertical';
	direction: 'forward' | 'reverse';
	flipFrequency: boolean;
};

export type AudioSpectrogramOptions = SpectrogramSettings & {
	// nullはプロジェクト全体のミックス。IDを指定するとPlayerの音量調整前を表示する。
	player: string | null;
};
