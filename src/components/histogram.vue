<template>
<div>
	<canvas :class="$style.canvas" :width="width" :height="height" ref="canvas"/>
</div>
</template>

<script lang="ts" setup>
import { onMounted, useTemplateRef } from 'vue';
import Worker from '@/histogram-renderer.js?worker';

const props = withDefaults(defineProps<{
	src: HTMLCanvasElement;
}>(), {
});

const width = 256;
const height = 150;

const worker = new Worker();

const canvas = useTemplateRef('canvas');

onMounted(() => {
	const dst = canvas.value!.transferControlToOffscreen();

	worker.postMessage({ dst: dst, dstWidth: width, dstHeight: height }, [dst]);

	const temp = new OffscreenCanvas(100, 100);
	const tempCtx = temp.getContext('2d')!;

	window.setInterval(() => {
		tempCtx.clearRect(0, 0, 100, 100);
		tempCtx.drawImage(props.src, 0, 0, 100, 100);
		const imageData = tempCtx.getImageData(0, 0, 100, 100).data;

		worker.postMessage({ imageData: imageData });
	}, 1000);
});
</script>

<style lang="scss" module>
.canvas {
	display: block;
}
</style>
