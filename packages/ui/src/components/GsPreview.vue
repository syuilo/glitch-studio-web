<template>
<GsDetachableView title="Preview">
	<template #controls>
		<div :class="$style.zoom">ZOOM: {{ Math.round(zoom * 100) }}%</div>
	</template>
	<template #default="{ detached }">
		<div ref="containerContainer" :class="$style.containerContainer" @wheel="onViewWheel" @click="onViewClick(detached)" @pointermove="onPointermove">
			<div ref="canvasContainer" :class="$style.canvasContainer" :style="{ scale: zoom }"></div>
		</div>
	</template>
</GsDetachableView>
</template>

<script lang="ts" setup>
import { watch, useTemplateRef, ref, onBeforeUnmount, onMounted } from 'vue';
import { genId } from '@glitch/shared/utility/id.ts';
import GsDetachableView from './GsDetachableView.vue';
import * as api from '@/api.ts';
import { appContext, engine, rendererEnv, resolutionFactor } from '@/app.ts';

const canvasContainer = useTemplateRef('canvasContainer');
const containerContainer = useTemplateRef('containerContainer');
const ZOOM_STEP = 1.25;
const zoom = ref(1 / ZOOM_STEP / ZOOM_STEP / ZOOM_STEP);

watch(resolutionFactor, (newFactor, oldFactor) => {
	zoom.value *= (oldFactor ?? 1) / newFactor;
}, { immediate: true });

onMounted(() => {
	if (canvasContainer.value != null) {
		canvasContainer.value.appendChild(engine.canvas);
	}
});

onBeforeUnmount(() => {
	if (canvasContainer.value != null && engine.canvas.parentNode === canvasContainer.value) {
		canvasContainer.value.removeChild(engine.canvas);
	}
});

async function onViewClick(detached: boolean) {
	if (detached) return;
	if (appContext.state.nodes.value.length === 0) {
		const result = await api.openImageOrVideoFile({});
		if (result == null) return;

		const assetId = genId();
		appContext.commit('addAsset', {
			id: assetId,
			name: result.name,
			width: result.width,
			height: result.height,
			data: result.data,
			fileDataType: result.type,
			fileData: result.fileData,
			hash: result.hash,
		});

		if (result.type.startsWith('image/')) {
			appContext.commit('addFxNode', {
				fx: 'image',
				id: genId(),
				params: {
					image: { type: 'literal', value: assetId },
				},
			});
		} else if (result.type.startsWith('video/')) {
			const playerId = genId();

			appContext.commit('addPlayer', {
				id: playerId,
				name: result.name,
				type: 'asset',
				assetId: assetId,
			});

			appContext.commit('addFxNode', {
				fx: 'video',
				id: genId(),
				params: {
					video: { type: 'literal', value: playerId },
				},
			});
		}
	}
}

function onPointermove(ev: PointerEvent) {
	if (canvasContainer.value == null) return;
	const rect = canvasContainer.value.getBoundingClientRect();
	engine.updatePointerPosition({
		x: (((ev.clientX - rect.left) / rect.width) - 0.5) * 2,
		y: -(((ev.clientY - rect.top) / rect.height) - 0.5) * 2,
	});
}

function onViewWheel(ev: WheelEvent) {
	ev.preventDefault();
	if (ev.deltaY < 0) {
		zoom.value = Math.max(0, Math.min(100, zoom.value * ZOOM_STEP));
	} else {
		zoom.value = Math.max(0, Math.min(100, zoom.value / ZOOM_STEP));
	}
}

</script>

<style module lang="scss">
.containerContainer {
	width: 100%;
	height: 100%;
	display: grid;
	place-content: center;
	$color1: #1a1a1a;
	$color2: #101010;
	background-color: $color1;
	background-image: linear-gradient(45deg, $color2 25%, transparent 25%, transparent 75%, $color2 75%, $color2), linear-gradient(-45deg, $color2 25%, transparent 25%, transparent 75%, $color2 75%, $color2);
	background-size: 32px 32px;
	animation: bg 0.7s linear infinite;
	overflow: clip;
	contain: content;
}

.canvasContainer {
	display: block;
}

@keyframes bg {
	0% {
		background-position: 0 0;
	}

	100% {
		background-position: -32px -32px;
	}
}
</style>
