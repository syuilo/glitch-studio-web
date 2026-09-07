<template>
<div :class="$style.root">
	<canvas :class="$style.canvas" :width="width" :height="height" ref="canvas"/>
</div>
</template>

<script lang="ts" setup>
import { engine } from '@/app.ts';
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';

const width = 256;
const height = 150;

const canvas = useTemplateRef('canvas');

onMounted(() => {
	engine.setHistogramCanvas(canvas.value!);
});

onBeforeUnmount(() => {
	engine.setHistogramCanvas(null);
});
</script>

<style lang="scss" module>
.root {
	position: relative;
	width: 100%;
	height: 100%;
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
