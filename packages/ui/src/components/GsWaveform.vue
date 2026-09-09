<template>
<div :class="$style.root">
	<!--
	<div :class="$style.header">
		<b>{{ i18n.ts.Waveform }}</b>
		<span style="opacity: 0.5;">RGB</span>
	</div>
	-->
	<div :class="$style.scope">
		<div ref="canvasContainer" :class="$style.canvas"></div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';
import { engine } from '@/app.ts';
import { i18n } from '@/i18n.ts';

const canvasContainer = useTemplateRef('canvasContainer');

onMounted(() => {
	if (canvasContainer.value != null) {
		canvasContainer.value.appendChild(engine.waveformCanvas);
	}
});

onBeforeUnmount(() => {
	if (canvasContainer.value != null) {
		canvasContainer.value.removeChild(engine.waveformCanvas);
	}
});
</script>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	height: 100%;
	min-height: 0;
	box-sizing: border-box;
}

.header {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	padding: 2px 4px 10px;
}

.scope {
	flex: 1;
	position: relative;
	width: 100%;
	overflow: clip;
}

.canvas {
	position: absolute;
	top: 0;
	left: 0;
	display: block;
	width: 100%;
	height: 100%;
}
</style>
