<template>
<div>
	<canvas :class="$style.canvas" :width="width" :height="height" ref="canvas"/>
</div>
</template>

<script lang="ts" setup>
import type { Engine } from '@/engine/engine.ts';
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';

const props = defineProps<{
	engine: Engine;
}>();

const width = 256;
const height = 150;

const canvas = useTemplateRef('canvas');

onMounted(() => {
	props.engine.setHistogramCanvas(canvas.value!);
});

onBeforeUnmount(() => {
	props.engine.setHistogramCanvas(null);
});
</script>

<style lang="scss" module>
.canvas {
	display: block;
}
</style>
