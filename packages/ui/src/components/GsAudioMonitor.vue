<template>
<GsDetachableView :title="mode === 'spectrum' ? 'Audio Spectrum' : 'Audio Waveform'" @change-window="startAnimationLoop">
	<template #controls>
		<label :class="$style.option"><input v-model="overlay" type="checkbox"> Overlay L/R</label>
	</template>
	<div :class="$style.root"><canvas ref="canvas" :class="$style.canvas" @wheel="onWheel"></canvas></div>
</GsDetachableView>
</template>

<script lang="ts" setup>
import { onMounted, onBeforeUnmount, useTemplateRef } from 'vue';
import GsDetachableView from './GsDetachableView.vue';
import { engine } from '@/app.ts';
import { AUDIO_MONITOR_SETTINGS as settings } from '@/audio-monitor.ts';

const props = defineProps<{ mode: 'spectrum' | 'waveform' }>();
const overlay = defineModel<boolean>('overlay', { default: false });
const canvas = useTemplateRef('canvas');
let animationFrame: number | undefined;
let animationWindow: Window | undefined;
let disposed = false;
let observer: ResizeObserver | undefined;
let width = 0;
let height = 0;
let waveformSeconds = settings.waveformSeconds;

function onWheel(event: WheelEvent) {
	if (props.mode !== 'waveform' || event.deltaY === 0) return;
	event.preventDefault();
	event.stopPropagation();
	const data = engine.readAudioMonitor();
	const sampleRate = data?.sampleRate ?? 48000;
	const maxSeconds = (data?.waveform[0].length ?? settings.waveformSize) / sampleRate;
	const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
	waveformSeconds = Math.max(2 / sampleRate, Math.min(maxSeconds, Math.min(waveformSeconds, maxSeconds) * Math.exp(Math.max(-1, Math.min(1, delta * 0.002)))));
	draw();
}

function draw() {
	const element = canvas.value;
	if (!element || width <= 0 || height <= 0 || element.ownerDocument.hidden) return;
	const context = element.getContext('2d');
	if (!context) return;
	const ratio = Math.min(2, element.ownerDocument.defaultView?.devicePixelRatio ?? 1);
	const pixelWidth = Math.max(1, Math.round(width * ratio));
	const pixelHeight = Math.max(1, Math.round(height * ratio));
	if (element.width !== pixelWidth || element.height !== pixelHeight) {
		element.width = pixelWidth;
		element.height = pixelHeight;
	}
	context.setTransform(ratio, 0, 0, ratio, 0, 0);
	context.globalAlpha = 1;
	context.fillStyle = '#111111';
	context.fillRect(0, 0, width, height);
	const data = engine.readAudioMonitor();
	const sampleRate = data?.sampleRate ?? 48000;
	const waveformCount = Math.max(2, Math.min(data?.waveform[0].length ?? settings.waveformSize, Math.round(sampleRate * waveformSeconds)));
	const top = 30;
	const bottom = 18;
	const plotHeight = Math.max(1, height - top - bottom);
	const laneHeight = overlay.value ? plotHeight : plotHeight / 2;
	const plotWidth = Math.max(1, width - 16);
	context.font = '10px sans-serif';
	context.textAlign = 'left';
	context.lineWidth = 1;
	context.strokeStyle = '#ffffff18';
	for (let lane = 0; lane < (overlay.value ? 1 : 2); lane++) {
		for (let step = 0; step <= 4; step++) {
			const y = top + lane * laneHeight + step / 4 * laneHeight;
			context.beginPath(); context.moveTo(8, y); context.lineTo(width - 8, y); context.stroke();
		}
	}
	const columns = Math.max(2, Math.min(2048, Math.floor(plotWidth)));
	for (let channel = 0; channel < 2; channel++) {
		const laneTop = top + (overlay.value ? 0 : channel * laneHeight);
		const baseline = laneTop + laneHeight;
		const color = channel === 0 ? settings.leftColor : settings.rightColor;
		context.save();
		context.beginPath(); context.rect(8, laneTop, plotWidth, laneHeight); context.clip();
		context.globalAlpha = overlay.value ? 0.5 : 1;
		context.strokeStyle = color;
		context.fillStyle = color;
		context.lineWidth = 1.25;
		context.beginPath();
		if (props.mode === 'spectrum') {
			context.moveTo(8, baseline);
			const values = data?.spectrum[channel];
			const sampleRate = data?.sampleRate ?? 48000;
			const maxFrequency = Math.min(settings.maxFrequency, sampleRate / 2);
			for (let x = 0; x < columns; x++) {
				const from = settings.minFrequency * (maxFrequency / settings.minFrequency) ** (x / columns) * settings.fftSize / sampleRate;
				const to = settings.minFrequency * (maxFrequency / settings.minFrequency) ** ((x + 1) / columns) * settings.fftSize / sampleRate;
				let db = settings.minDecibels;
				if (values) {
					for (let bin = Math.floor(from); bin <= Math.min(values.length - 1, Math.floor(to)); bin++) db = Math.max(db, values[bin]);
				}
				const level = Math.min(1, Math.max(0, (db - settings.minDecibels) / (settings.maxDecibels - settings.minDecibels)));
				context.lineTo(8 + x / (columns - 1) * plotWidth, baseline - level * (laneHeight - 4));
			}
			context.lineTo(width - 8, baseline);
			context.closePath();
			// 重ね表示では左右それぞれをalpha=0.5で一度だけ描画する。
			context.fill();
		} else {
			const values = data?.waveform[channel];
			const count = waveformCount;
			const start = (values?.length ?? count) - count;
			const center = laneTop + laneHeight / 2;
			const scale = laneHeight * 0.45;
			for (let x = 0; x < columns; x++) {
				const from = start + Math.floor(x * count / columns);
				const to = Math.min(start + count, Math.max(from + 1, start + Math.floor((x + 1) * count / columns)));
				let min = Infinity;
				let max = -Infinity;
				for (let i = from; i < to; i++) {
					const value = values?.[i] ?? 0;
					min = Math.min(min, value); max = Math.max(max, value);
				}
				const position = 8 + x / (columns - 1) * plotWidth;
				if (x === 0) context.moveTo(position, center - max * scale);
				else context.lineTo(position, center - max * scale);
				context.lineTo(position, center - min * scale);
			}
			context.stroke();
		}
		context.restore();
		context.fillStyle = color;
		context.fillText(channel === 0 ? 'L' : 'R', 8 + (overlay.value ? channel * 18 : 0), laneTop + 12);
	}
	context.fillStyle = '#a1adaf';
	if (props.mode === 'spectrum') {
		const maxFrequency = Math.min(settings.maxFrequency, (data?.sampleRate ?? 48000) / 2);
		for (const frequency of [20, 100, 1000, 10000, 20000]) {
			if (frequency < settings.minFrequency || frequency > maxFrequency) continue;
			const x = 8 + Math.log(frequency / settings.minFrequency) / Math.log(maxFrequency / settings.minFrequency) * plotWidth;
			context.textAlign = frequency === settings.minFrequency ? 'left' : frequency === maxFrequency ? 'right' : 'center';
			context.fillText(frequency >= 1000 ? `${frequency / 1000}k` : String(frequency), x, height - 4);
		}
	} else {
		context.textAlign = 'left'; context.fillText(`−${(waveformCount / sampleRate * 1000).toFixed(1)} ms`, 8, height - 4);
		context.textAlign = 'right'; context.fillText('0', width - 8, height - 4);
	}
}

function tick() {
	draw();
	animationFrame = animationWindow!.requestAnimationFrame(tick);
}

function startAnimationLoop() {
	if (disposed) return;
	if (animationFrame !== undefined) animationWindow?.cancelAnimationFrame(animationFrame);
	// 移動元のウィンドウが非表示・閉鎖されても更新が止まらないよう、移動先で登録し直す。
	animationWindow = canvas.value?.ownerDocument.defaultView ?? window;
	animationFrame = animationWindow.requestAnimationFrame(tick);
}

onMounted(() => {
	observer = new ResizeObserver(entries => {
		width = entries[0].contentRect.width;
		height = entries[0].contentRect.height;
		draw();
	});
	if (canvas.value) observer.observe(canvas.value);
	// PCM配列をVueのリアクティブ状態に入れず、Canvasだけを更新する。
	startAnimationLoop();
});

onBeforeUnmount(() => {
	disposed = true;
	if (animationFrame !== undefined) animationWindow?.cancelAnimationFrame(animationFrame);
	observer?.disconnect();
});
</script>

<style module lang="scss">
.root { position: relative; width: 100%; height: 100%; min-width: 0; min-height: 0; }
.canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.option { display: flex; align-items: center; gap: 4px; font-size: 11px; }
</style>
