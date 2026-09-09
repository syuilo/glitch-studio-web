<template>
<div :class="$style.root">
	<div v-if="pipWindow" :class="$style.placeholder">
		<span>Preview is open in PiP</span>
		<button class="_button" @click="closePip">Return preview</button>
	</div>
	<div v-show="!pipWindow" ref="home" :class="$style.root">
		<div ref="preview" :class="$style.root" @wheel="onViewWheel">
			<div :class="$style.scaling">
				<button v-if="pipWindow" class="_button" @click.stop="closePip">Return preview</button>
				<div :class="$style.zoom">ZOOM: {{ Math.round(zoom * 100) }}%</div>
			</div>
			<div :class="$style.container" @click="onViewClick()" @mousemove="onMousemove" @contextmenu.prevent.stop="onContextmenu">
				<canvas ref="canvas" :class="$style.canvas" :style="{ scale: zoom }"></canvas>
			</div>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { watch, useTemplateRef, ref, shallowRef, onBeforeUnmount } from 'vue';
import { genId } from '@/utility/id.ts';
import * as api from '@/api.js';
import { appContext, engine, rendererEnv, resolutionFactor } from '@/app.ts';
import * as ui from '@/ui.js';
import { MenuItem } from '@/types/menu.ts';

const canvas = useTemplateRef('canvas');
const home = useTemplateRef('home');
const preview = useTemplateRef('preview');
const pipWindow = shallowRef<Window | null>(null);
// Kept local until TypeScript's DOM library includes Document PiP.
const pipApi = (window as Window & {
	documentPictureInPicture?: { requestWindow(options: { width: number; height: number }): Promise<Window> };
}).documentPictureInPicture;
let openingPip = false;
let disposed = false;

function restorePreview() {
	const pip = pipWindow.value;
	if (!pip) return;
	pip.removeEventListener('pagehide', restorePreview);
	// Restore synchronously, before the PiP document or Vue subtree is destroyed.
	if (home.value && preview.value) home.value.append(preview.value);
	engine.setRenderWindow(window);
	pipWindow.value = null;
}

function closePip() {
	const pip = pipWindow.value;
	restorePreview();
	pip?.close();
}

async function startPip() {
	if (disposed || openingPip || !pipApi || !preview.value) return;
	if (pipWindow.value && !pipWindow.value.closed) {
		pipWindow.value.focus();
		return;
	}
	openingPip = true;
	let pip: Window | undefined;
	try {
		const { width, height } = preview.value.getBoundingClientRect();
		pip = await pipApi.requestWindow({ width: Math.max(240, Math.round(width)), height: Math.max(160, Math.round(height)) });
		if (disposed || pip.closed) {
			pip.close();
			return;
		}
		pipWindow.value = pip;
		pip.addEventListener('pagehide', restorePreview);
		pip.document.title = 'Glitch Studio — Preview';
		for (const style of window.document.querySelectorAll('style, link[rel="stylesheet"]')) {
			pip.document.head.append(style.cloneNode(true));
		}
		pip.document.body.append(preview.value!);
		engine.setRenderWindow(pip);
	} catch (error) {
		restorePreview();
		pip?.close();
		if (!disposed) ui.alert({ type: 'error', title: 'Could not open PiP', text: String(error) });
	} finally {
		openingPip = false;
	}
}

onBeforeUnmount(() => {
	disposed = true;
	closePip();
});
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
	if (pipWindow.value) return;
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
	// Shared context menus render in the main document; PiP has a return button.
	if (pipWindow.value) return;
	const menuItems: MenuItem[] = pipApi ? [{
		text: 'Start PiP',
		action: startPip,
	}] : [{ type: 'label', text: 'PiP is not supported in this browser' }];
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
	display: flex;
	gap: 12px;
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
	//box-shadow: 0px 0px 0px 999px #0006;
}

.placeholder {
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
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
