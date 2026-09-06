<template>
<GsWorkspacePanel :panel="panel" :isStacked="isStacked">
	<template #header>
		<i class="ti ti-list"></i><span style="margin-left: 8px;">Preview</span>
	</template>

	<div :class="$style.root" dropzone="copy" @wheel="onViewWheel" @dragover.prevent="e => { e.dataTransfer.dropEffect = 'copy'; }" @drop.prevent="onDrop">
		<div :class="$style.scaling">
			<div :class="$style.zoom">ZOOM: {{ Math.round(zoom * 100) }}%</div>
		</div>
		<div :class="$style.container" @click="onViewClick()" @mousemove="onMousemove">
			<canvas ref="canvas" :class="$style.canvas"/>
		</div>
	</div>
</GsWorkspacePanel>
</template>

<script lang="ts" setup>
import { watch, useTemplateRef, ref, onMounted } from 'vue';
import GsWorkspacePanel from './GsWorkspacePanel.vue';
import { WorkspacePanel } from '@/types/workspace.ts';
import { useStore } from '@/store.ts';
import { i18n } from '@/i18n';
import { genId } from '@/utils';
import * as api from '@/api.js';
import { engine, rendererEnv } from '@/app.ts';

const props = defineProps<{
	panel: WorkspacePanel;
	isStacked: boolean;
}>();

const store = useStore();

const canvas = useTemplateRef('canvas');
const ZOOM_STEP = 1.25;
const zoom = ref(1 / ZOOM_STEP / ZOOM_STEP / ZOOM_STEP);

watch(canvas, () => {
	if (canvas.value != null) {
		engine.setCanvas({
			canvas: canvas.value,
			resolution: {
				width: store.renderWidth,
				height: store.renderHeight,
			}
		});
	} else {
		engine.unsetCanvas();
	}
}, { immediate: true });

async function onViewClick() {
	if (store.nodes.length === 0) {
		const result = await api.openImageOrVideoFile({});
		if (result == null) return;

		const assetId = genId();
		store.addAsset({
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
			store.addFxNode({
				fx: 'image',
				id: genId(),
				params: {
					image: { type: 'literal', value: assetId }
				}
			});
		} else if (result.type.startsWith('video/')) {
			store.addFxNode({
				fx: 'video',
				id: genId(),
				params: {
					video: { type: 'literal', value: assetId }
				}
			});
		}
	}
}

function onDrop(ev: DragEvent) {
	for (const file of ev.dataTransfer!.files) {
		openImageFromPath(file.path);
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
</script>

<style module lang="scss">
.root {
	position: relative;
	width: 100%;
	height: 100%;
	box-sizing: border-box;
}

.scaling {
	position: absolute;
	z-index: 1;
	top: 0;
	right: 0;
	padding: 4px 8px;
	background: #0008;
}

.histogram {
	position: absolute;
	z-index: 1;
	bottom: 12px;
	left: 12px;
	padding: 16px;
	pointer-events: none;
	background: rgba(0, 0, 0, 0.5);
	backdrop-filter: blur(8px);
	border-radius: 8px;
}

.container {
	width: 100%;
	height: 100%;
	display: grid;
	place-content: center;
	$color1: #3a3a3a;
	$color2: #303030;
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
