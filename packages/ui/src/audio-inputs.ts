import { playerAudioSourceId } from '@glitch/shared/audio.ts';
import type { AudioSourceId } from '@glitch/shared/audio.ts';
import workletUrl from './audio-capture.worklet.js?url';

type Capture = {
	setState: (active: boolean, generation: number) => void;
	dispose: () => void;
};

type PlayerAudio = {
	media: HTMLMediaElement;
	volume: number;
	generation: number;
	gain: GainNode | null;
	source: MediaElementAudioSourceNode | null;
	capture: Capture | null;
	ready: Promise<void> | null;
	cleanup: () => void;
};

export class AudioInputs {
	private context: AudioContext | null = null;
	private moduleReady: Promise<void> | null = null;
	private modules = new WeakMap<BaseAudioContext, Promise<void>>();
	private players = new Map<string, PlayerAudio>();

	constructor(private attach: (id: AudioSourceId, port: MessagePort) => void,
		private reset: (id: AudioSourceId, generation: number | null) => void) {}

	// Playerの知識を持たない接続口。将来は音声グラフの出力AudioNodeも渡せる。
	// prepare(context)の完了後に呼ぶ。接続中にawaitせず、削除済みPlayerの再接続を防ぐ。
	public captureSource(id: AudioSourceId, source: AudioNode): Capture {
		const context = source.context as AudioContext;
		const capture = new AudioWorkletNode(context, 'glitch-audio-capture', {
			numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
			channelCountMode: 'max', channelInterpretation: 'discrete',
		});
		const channel = new MessageChannel();
		try {
			this.attach(id, channel.port2);
		} catch (error) {
			channel.port1.close();
			channel.port2.close();
			capture.port.close();
			throw error;
		}
		capture.port.postMessage({ type: 'connect', port: channel.port1 }, [channel.port1]);
		source.connect(capture);
		capture.connect(context.destination);
		capture.onprocessorerror = () => this.reset(id, null);
		return {
			setState: (active, generation) => capture.port.postMessage({ type: 'state', active, generation }),
			dispose: () => {
				capture.onprocessorerror = null;
				capture.port.postMessage({ type: 'dispose' });
				source.disconnect(capture);
				capture.disconnect();
				capture.port.close();
				this.reset(id, null);
			},
		};
	}

	public prepare(context: BaseAudioContext): Promise<void> {
		let ready = this.modules.get(context);
		if (!ready) {
			ready = context.audioWorklet.addModule(workletUrl).catch(error => {
				this.modules.delete(context);
				throw error;
			});
			this.modules.set(context, ready);
		}
		return ready;
	}

	public registerPlayer(id: string, media: HTMLMediaElement) {
		this.removePlayer(id);
		const entry: PlayerAudio = {
			media, volume: media.muted ? 0 : media.volume, generation: 0,
			gain: null, source: null, capture: null, ready: null, cleanup: () => {},
		};
		this.players.set(id, entry);
		const sync = () => entry.capture?.setState(!media.paused && !media.seeking && !media.ended, entry.generation);
		const reset = () => {
			entry.generation++;
			this.reset(playerAudioSourceId(id), entry.generation);
			sync();
		};
		for (const name of ['play', 'pause', 'ended', 'seeked'] as const) media.addEventListener(name, sync);
		for (const name of ['seeking', 'emptied', 'error'] as const) media.addEventListener(name, reset);
		entry.cleanup = () => {
			for (const name of ['play', 'pause', 'ended', 'seeked'] as const) media.removeEventListener(name, sync);
			for (const name of ['seeking', 'emptied', 'error'] as const) media.removeEventListener(name, reset);
		};
	}

	public async play(id: string) {
		const entry = this.players.get(id);
		if (!entry) return;
		if (!this.context) this.context = new AudioContext();
		const context = this.context;
		// ユーザーの再生操作中にresumeを呼び、モジュール読み込みより先に有効化する。
		const resumed = context.resume();
		if (!this.moduleReady) {
			this.moduleReady = this.prepare(context).catch(error => {
				this.moduleReady = null;
				throw error;
			});
		}
		if (!entry.ready) {
			entry.ready = this.initializePlayer(id, entry, context).catch(error => {
				entry.ready = null;
				throw error;
			});
		}
		await Promise.all([resumed, entry.ready]);
		if (this.players.get(id) !== entry) return;
		await entry.media.play();
	}

	private async initializePlayer(id: string, entry: PlayerAudio, context: AudioContext) {
		await this.moduleReady;
		if (this.players.get(id) !== entry) return;
		// 同じメディア要素にMediaElementAudioSourceNodeを二重作成しない。
		entry.source ??= context.createMediaElementSource(entry.media);
		entry.gain ??= context.createGain();
		entry.gain.gain.value = entry.volume;
		entry.source.connect(entry.gain);
		entry.gain.connect(context.destination);
		entry.media.volume = 1;
		entry.media.muted = false;
		entry.capture = this.captureSource(playerAudioSourceId(id), entry.source);
		entry.capture.setState(!entry.media.paused && !entry.media.seeking, entry.generation);
	}

	public getVolume(id: string) { return this.players.get(id)?.volume ?? 0.5; }

	public setVolume(id: string, volume: number) {
		const entry = this.players.get(id);
		if (!entry) return;
		entry.volume = Math.min(1, Math.max(0, volume));
		if (entry.gain) entry.gain.gain.setTargetAtTime(entry.volume, entry.gain.context.currentTime, 0.01);
		else entry.media.volume = entry.volume;
		entry.media.dispatchEvent(new Event('volumechange'));
	}

	public removePlayer(id: string) {
		const entry = this.players.get(id);
		if (!entry) return;
		this.players.delete(id);
		entry.cleanup();
		entry.media.pause();
		entry.capture?.dispose();
		entry.source?.disconnect();
		entry.gain?.disconnect();
		this.reset(playerAudioSourceId(id), null);
	}

	public dispose() {
		for (const id of this.players.keys()) this.removePlayer(id);
		void this.context?.close();
		this.context = null;
		this.moduleReady = null;
	}
}
