<template>
<GsDetachableView title="Audio Spectrogram">
	<div :class="$style.root"><canvas ref="canvas" :class="$style.canvas"></canvas></div>
</GsDetachableView>
</template>

<script lang="ts" setup>
import { computed, onMounted, onBeforeUnmount, useTemplateRef, watch } from 'vue';
import GsDetachableView from './GsDetachableView.vue';

const props = defineProps<{ options?: any }>();

const options = computed(() => ({
	player: null,
	channel: 'mix',
	fftSize: 2048,
	window: 'hann',
	smoothing: 0,
	minFrequency: 20,
	maxFrequency: 20000,
	logarithmic: false,
	minDb: -80,
	maxDb: 0,
	duration: 10,
	orientation: 'horizontal',
	direction: 'forward',
	flipFrequency: false,
	...props.options,
}));

const canvas = useTemplateRef('canvas');
</script>

<style module lang="scss">
.root {
	position: relative;
	flex: 1;
	min-height: 0;
	height: 100%;
	overflow: clip;
}

.canvas {
	position: absolute;
	inset: 0;
	display: block;
	width: 100%;
	height: 100%;
}
</style>
