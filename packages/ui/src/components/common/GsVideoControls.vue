<template>
<div :class="$style.root">
	<div :class="$style.row">
		<GsButton iconOnly primary :disabled="!ready" :title="paused ? i18n.ts._VideoControls.Play : i18n.ts._VideoControls.Pause" @click="togglePlayback">
			<i :class="paused ? 'ti ti-player-play' : 'ti ti-player-pause'"></i>
		</GsButton>
		<GsButton iconOnly :disabled="!ready" :title="i18n.ts._VideoControls.Stop" @click="stop">
			<i class="ti ti-player-stop"></i>
		</GsButton>
	</div>
	<div :class="$style.row">
		<span :class="$style.time" class="_monospace">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
	</div>
	<input :class="$style.slider" type="range" min="0" :max="duration || 1" step="0.01" :value="currentTime" :disabled="!ready || duration === 0" @input="seek"/>
	<!-- 音量調整はそれを利用するノード側の役目。「動画の明るさ調整」などというコントロールが無いのと一緒
	<label :class="$style.row">
		<i class="ti ti-volume"></i>
		<span>{{ i18n.ts._VideoControls.Volume }}</span>
		<input :class="$style.slider" type="range" min="0" max="1" step="0.01" :value="volume" :disabled="!video" @input="setVolume"/>
		<span>{{ Math.round(volume * 100) }}%</span>
	</label>
	-->
	<div v-if="error" role="alert">{{ error }}</div>
</div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import GsButton from './GsButton.vue';
import { i18n } from '@/i18n.ts';

const props = defineProps<{
	video: HTMLMediaElement | null;
	play?: () => Promise<void>;
	//getVolume?: () => number;
	//setVolume?: (volume: number) => void;
}>();

const paused = ref(true);
const ready = ref(false);
const currentTime = ref(0);
const duration = ref(0);
//const volume = ref(0.5);
const error = ref('');

watch(() => props.video, (video, _, onCleanup) => {
	error.value = '';
	let animationFrameId: number | null = null;
	const updateCurrentTime = () => {
		animationFrameId = null;
		currentTime.value = video?.currentTime ?? 0;
		if (video && !video.paused && !video.ended && !video.error) {
			animationFrameId = requestAnimationFrame(updateCurrentTime);
		}
	};
	const sync = () => {
		paused.value = video?.paused ?? true;
		// Keep controls enabled while the frame at the seek destination is loading.
		ready.value = video != null && video.readyState >= video.HAVE_METADATA && !video.error;
		currentTime.value = video?.currentTime ?? 0;
		duration.value = video && Number.isFinite(video.duration) ? video.duration : 0;
		if (video && !video.paused && !video.ended && !video.error) {
			if (animationFrameId === null) animationFrameId = requestAnimationFrame(updateCurrentTime);
		} else if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		//volume.value = props.getVolume ? props.getVolume() : video?.muted ? 0 : (video?.volume ?? 0.5);
	};
	sync();
	if (!video) return;
	const events = ['play', 'pause', 'ended', 'timeupdate', 'seeking', 'seeked', 'loadeddata', 'loadedmetadata', 'durationchange', 'volumechange', 'emptied', 'error'] as const;
	for (const event of events) video.addEventListener(event, sync);
	onCleanup(() => {
		if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
		for (const event of events) video.removeEventListener(event, sync);
	});
}, { immediate: true });

async function togglePlayback() {
	const video = props.video;
	if (!video) return;
	error.value = '';
	if (!video.paused) {
		video.pause();
		return;
	}
	try {
		await (props.play ? props.play() : video.play());
	} catch (err) {
		if (props.video === video && !(err instanceof DOMException && err.name === 'AbortError')) {
			error.value = String(err);
		}
	}
}

function stop() {
	if (!props.video) return;
	props.video.pause();
	props.video.currentTime = 0;
	currentTime.value = 0;
}

function seek(event: Event) {
	if (!props.video || duration.value === 0) return;
	props.video.currentTime = Math.min(duration.value, Math.max(0, (event.target as HTMLInputElement).valueAsNumber));
	currentTime.value = props.video.currentTime;
}

/*
function setVolume(event: Event) {
	if (!props.video) return;
	if (props.setVolume) {
		props.setVolume((event.target as HTMLInputElement).valueAsNumber);
		return;
	}
	props.video.volume = (event.target as HTMLInputElement).valueAsNumber;
	props.video.muted = false;
}
*/

function formatTime(value: number): string {
	const totalMilliseconds = Math.floor(value * 1000);
	const hours = String(Math.floor(totalMilliseconds / 3600000)).padStart(2, '0');
	const minutes = String(Math.floor(totalMilliseconds / 60000) % 60).padStart(2, '0');
	const seconds = String(Math.floor(totalMilliseconds / 1000) % 60).padStart(2, '0');
	const milliseconds = String(totalMilliseconds % 1000).padStart(3, '0');
	return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}
</script>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.row {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 90%;
}

.slider {
	flex: 1;
	min-width: 0;
	width: 100%;
	margin: 0;
	accent-color: var(--THEME-accent);
}

.time {
	font-variant-numeric: tabular-nums;
}
</style>
