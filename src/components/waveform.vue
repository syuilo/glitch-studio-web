<template>
<div class="_gs-container" :class="$style.root">
	<div :class="$style.header">
		<strong>{{ i18n.ts.Waveform }}</strong>
		<span style="opacity: 0.5;">RGB</span>
	</div>
	<div :class="$style.scope">
		<canvas :class="$style.canvas"
			ref="canvas"
			:width="width"
			:height="height"
			role="img"
			:aria-label="i18n.ts.RgbWaveform"
		/>
	</div>
</div>
</template>

<script lang="ts" setup>
import type { Engine } from '@/engine/engine.ts';
import { i18n } from '@/i18n.ts';
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';

const props = defineProps<{
	engine: Engine;
}>();

const width = 512;
const height = 256;
const canvas = useTemplateRef('canvas');

onMounted(() => {
	props.engine.setWaveformCanvas(canvas.value!);
});

onBeforeUnmount(() => {
	props.engine.setWaveformCanvas(null);
});
</script>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	height: 100%;
	min-height: 0;
	padding: 12px;
}

.header {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	padding: 2px 4px 10px;
	font-size: 12px;
}

.scope {
	width: 100%;
	aspect-ratio: 2;
	border: solid 1px rgba(255, 255, 255, 0.08);
	background: #101010;
	box-shadow: 0 2px 2px rgba(0, 0, 0, 0.55) inset;
	overflow: hidden;
}

.canvas {
	display: block;
	width: 100%;
	height: 100%;
}
</style>
