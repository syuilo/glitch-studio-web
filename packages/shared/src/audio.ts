// 取得元のIDはPlayerに限定しない。将来は音声グラフの出力も登録できる。
export type AudioSourceId = string;

export const playerAudioSourceId = (playerId: string): AudioSourceId => `player:${playerId}`;

export type AudioChunk = {
	type: 'samples';
	generation: number;
	startFrame: number;
	sampleRate: number;
	channelCount: number;
	frameCount: number;
	// 最大2チャンネル、チャンネルごとにframeCount個のサンプル。
	buffer: ArrayBuffer;
};

export type AudioCaptureMessage = AudioChunk | {
	type: 'reset';
	generation: number;
};
