<template>
<div :class="$style.root" @wheel="onViewWheel">
	<div :class="$style.scaling">
		<div :class="$style.zoom">ZOOM: {{ Math.round(zoom * 100) }}%</div>
	</div>
	<div :class="$style.container" @click="onViewClick()" @mousemove="onMousemove" @contextmenu.prevent.stop="onContextmenu">
		<canvas ref="canvas" :class="$style.canvas"></canvas>
	</div>
</div>
</template>

<script lang="ts" setup>
import { watch, useTemplateRef, ref, onMounted } from 'vue';
import { i18n } from '@/i18n.ts';
import { genId } from '@/utility/id.ts';
import * as api from '@/api.js';
import { appContext, engine, rendererEnv, resolutionFactor } from '@/app.ts';
import * as ui from '@/ui.js';
import { MenuItem } from '@/types/menu.ts';

const canvas = useTemplateRef('canvas');
const ZOOM_STEP = 1.25;
const zoom = ref(1 / ZOOM_STEP / ZOOM_STEP / ZOOM_STEP);

watch(resolutionFactor, (newFactor, oldFactor) => {
	zoom.value *= (oldFactor ?? 1) / newFactor;
}, { immediate: true });

watch(() => [canvas.value, appContext.state.resolution.value, resolutionFactor.value], () => {
	if (canvas.value != null) {
		engine.setCanvas({
			canvas: canvas.value,
			resolution: {
				width: appContext.state.resolution.value.width * resolutionFactor.value,
				height: appContext.state.resolution.value.height * resolutionFactor.value,
			},
		});
	} else {
		engine.unsetCanvas();
	}
}, { immediate: true });

async function onViewClick() {
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
			appContext.commit('addFxNode', {
				fx: 'video',
				id: genId(),
				params: {
					video: { type: 'literal', value: { type: 'asset', id: assetId } },
				},
			});
		}
	}
}

function onMousemove(ev: MouseEvent) {
	const rect = canvas.value!.getBoundingClientRect();
	rendererEnv.mouseX = ((ev.clientX - rect.left) / rect.width) - 0.5;
	rendererEnv.mouseY = ((ev.clientY - rect.top) / rect.height) - 0.5;
}

function onViewWheel(ev: WheelEvent) {
	ev.preventDefault();
	if (ev.deltaY < 0) {
		zoom.value = Math.max(0, Math.min(100, zoom.value * ZOOM_STEP));
	} else {
		zoom.value = Math.max(0, Math.min(100, zoom.value / ZOOM_STEP));
	}
}

function onContextmenu(ev: PointerEvent) {
	const menuItems: MenuItem[] = [{
		text: 'Start PiP',
		action: () => {
			// TODO
		},
	}];
	ui.contextMenu(menuItems, ev);
}

</script>

<style module lang="scss">
.root {
	position: relative;
	width: 100%;
	height: 100%;
}

.scaling {
	position: absolute;
	z-index: 1;
	top: 0;
	right: 0;
	padding: 4px 8px;
	background: #0008;
}

.container {
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

.canvas {
	display: block;
	image-rendering: pixelated;
	scale: v-bind(zoom);
	//box-shadow: 0px 0px 0px 999px #0006;
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
