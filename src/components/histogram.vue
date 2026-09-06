<template>
<div>
	<canvas :class="$style.canvas" :width="width" :height="height" ref="canvas"/>
</div>
</template>

<script lang="ts" setup>
import type { GlitchRenderer } from '@/engine/renderer.ts';
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';

const props = defineProps<{
	renderer: GlitchRenderer;
}>();

const width = 256;
const height = 150;

const canvas = useTemplateRef('canvas');

onMounted(() => {
	props.renderer.setHistogramCanvas(canvas.value!);
});

onBeforeUnmount(() => {
	props.renderer.setHistogramCanvas(null);
});
</script>

<style lang="scss" module>
.canvas {
	display: block;
}
</style>
