<template>
<GsDetachableView title="Audio Spectrogram">
	<div :class="$style.root"><canvas ref="canvas" :class="$style.canvas"></canvas></div>
</GsDetachableView>
</template>

<script lang="ts" setup>
import { computed, onMounted, onBeforeUnmount, useTemplateRef, watch } from 'vue';
import { audioSpectrogramDefaults } from '@glitch/shared/utility/audio-spectrogram.ts';
import type { AudioSpectrogramOptions } from '@glitch/shared/utility/audio-spectrogram.ts';
import GsDetachableView from './GsDetachableView.vue';
import { engine } from '@/app.ts';

// エフェクトの全パラメータをリテラル値で指定可能。省略値はエフェクトの既定値に追従する。
const props = defineProps<{ options?: Partial<AudioSpectrogramOptions> }>();
const options = computed(() => ({ ...audioSpectrogramDefaults(), ...props.options }));
const canvas = useTemplateRef('canvas');
const id = crypto.randomUUID();
let release: (() => void) | undefined;
let observer: ResizeObserver | undefined;
let stopWatching: (() => void) | undefined;

function resize() {
	const element = canvas.value;
	if (!element || !release) return;
	const ratio = Math.min(2, element.ownerDocument.defaultView?.devicePixelRatio ?? 1);
	engine.resizeAudioSpectrogramMonitor(id,
		Math.round(element.clientWidth * ratio), Math.round(element.clientHeight * ratio));
}

onMounted(() => {
	observer = new ResizeObserver(resize);
	observer.observe(canvas.value!);
	stopWatching = watch(engine.isReady, ready => {
		if (!ready || release || !canvas.value) return;
		release = engine.addAudioSpectrogramMonitor(id, canvas.value.transferControlToOffscreen(), options.value);
		resize();
	}, { immediate: true });
});

watch(options, value => {
	if (release && engine.isReady.value) engine.updateAudioSpectrogramMonitor(id, value);
}, { deep: true });

onBeforeUnmount(() => {
	stopWatching?.();
	observer?.disconnect();
		release?.();
});
</script>

<style module lang="scss">
.root { position: relative; flex: 1; min-height: 0; height: 100%; overflow: hidden; }
.canvas { position: absolute; inset: 0; display: block; width: 100%; height: 100%; }
</style>
