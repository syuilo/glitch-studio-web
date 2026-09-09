<template>
<div :class="$style.root">
	<div v-if="previewWindow" :class="$style.placeholder">
		<span>Preview is open in {{ windowMode === 'pip' ? 'PiP' : 'another window' }}</span>
		<button class="_button" @click="closePreview">Return preview</button>
	</div>
	<div v-show="!previewWindow" ref="home" :class="$style.root">
		<div ref="preview" :class="$style.root" @wheel="onViewWheel">
			<div :class="$style.scaling">
				<button v-if="previewWindow && windowMode === 'window'" class="_button" @click.stop="toggleFullscreen">{{ fullscreen ? 'Exit fullscreen' : 'Fullscreen' }}</button>
				<button v-if="previewWindow" class="_button" @click.stop="closePreview">Return preview</button>
				<div :class="$style.zoom">ZOOM: {{ Math.round(zoom * 100) }}%</div>
			</div>
			<div :class="$style.containerContainer" @click="onViewClick()" @mousemove="onMousemove" @contextmenu.prevent.stop="onContextmenu">
				<div ref="canvasContainer" :class="$style.canvasContainer" :style="{ scale: zoom }"></div>
			</div>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { watch, useTemplateRef, ref, shallowRef, onBeforeUnmount, onMounted } from 'vue';
import { genId } from '@/utility/id.ts';
import * as api from '@/api.js';
import { appContext, engine, rendererEnv, resolutionFactor } from '@/app.ts';
import * as ui from '@/ui.js';
import { MenuItem } from '@/types/menu.ts';

const canvasContainer = useTemplateRef('canvasContainer');
const home = useTemplateRef('home');
const preview = useTemplateRef('preview');
const previewWindow = shallowRef<Window | null>(null);
const windowMode = ref<'pip' | 'window'>('pip');
const fullscreen = ref(false);

function updateFullscreen() {
	fullscreen.value = !!previewWindow.value?.document.fullscreenElement;
}

async function toggleFullscreen() {
	const doc = previewWindow.value?.document;
	if (!doc || windowMode.value !== 'window') return;
	try {
		if (doc.fullscreenElement) await doc.exitFullscreen();
		else await doc.documentElement.requestFullscreen();
	} catch (error) {
		ui.alert({ type: 'error', title: 'Could not change fullscreen', text: String(error) });
	}
}

// Kept local until TypeScript's DOM library includes Document PiP.
const pipApi = (window as Window & {
	documentPictureInPicture?: { requestWindow(options: { width: number; height: number }): Promise<Window> };
}).documentPictureInPicture;
let openingPreview = false;
let disposed = false;

function restorePreview() {
	const pip = previewWindow.value;
	if (!pip) return;
	pip.removeEventListener('pagehide', restorePreview);
	pip.document.removeEventListener('fullscreenchange', updateFullscreen);
	// Restore synchronously, before the child document or Vue subtree is destroyed.
	if (home.value && preview.value) home.value.append(preview.value);
	previewWindow.value = null;
	fullscreen.value = false;
}

function closePreview() {
	const pip = previewWindow.value;
	restorePreview();
	pip?.close();
}

async function openPreview(mode: 'pip' | 'window') {
	if (disposed || openingPreview || (mode === 'pip' && !pipApi) || !preview.value) return;
	if (previewWindow.value && !previewWindow.value.closed) {
		previewWindow.value.focus();
		return;
	}
	openingPreview = true;
	let pip: Window | undefined;
	try {
		const { width, height } = preview.value.getBoundingClientRect();
		const size = { width: Math.max(240, Math.round(width)), height: Math.max(160, Math.round(height)) };
		if (mode === 'pip') {
			pip = await pipApi!.requestWindow(size);
		} else {
			// Open synchronously within the menu click's user activation.
			pip = window.open('', '_blank', `popup,width=${size.width},height=${size.height}`) ?? undefined;
			if (!pip) throw new Error('The popup was blocked. Please allow popups for this site and try again.');
		}
		if (disposed || pip.closed) {
			pip.close();
			return;
		}
		previewWindow.value = pip;
		windowMode.value = mode;
		pip.addEventListener('pagehide', restorePreview);
		pip.document.addEventListener('fullscreenchange', updateFullscreen);
		pip.document.title = 'Glitch Studio — Preview';
		for (const style of window.document.querySelectorAll('style, link[rel="stylesheet"]')) {
			pip.document.head.append(style.cloneNode(true));
		}
		pip.document.body.append(preview.value!);
	} catch (error) {
		restorePreview();
		pip?.close();
		if (!disposed) ui.alert({ type: 'error', title: 'Could not open preview', text: String(error) });
	} finally {
		openingPreview = false;
	}
}

// Unlike PiP, ordinary popups can outlive their opener.
window.addEventListener('pagehide', closePreview);
onBeforeUnmount(() => {
	disposed = true;
	closePreview();
	window.removeEventListener('pagehide', closePreview);
});
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

async function onViewClick() {
	if (previewWindow.value) return;
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
	//const rect = canvas.value!.getBoundingClientRect();
	//rendererEnv.mouseX = ((ev.clientX - rect.left) / rect.width) - 0.5;
	//rendererEnv.mouseY = ((ev.clientY - rect.top) / rect.height) - 0.5;
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
	// Shared context menus render in the main document; detached previews have buttons.
	if (previewWindow.value) return;
	const menuItems: MenuItem[] = pipApi ? [{
		text: 'Start PiP',
		action: () => openPreview('pip'),
	}] : [{ type: 'label', text: 'PiP is not supported in this browser' }];
	menuItems.unshift({ text: 'Open in new window', action: () => openPreview('window') });
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
