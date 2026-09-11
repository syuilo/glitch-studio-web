<template>
<GsDetachableView title="Audio Spectrogram" @change-window="restartFrame">
	<div :class="$style.root"><canvas ref="canvas" :class="$style.canvas"></canvas></div>
</GsDetachableView>
</template>

<script lang="ts" setup>
import { computed, onMounted, onBeforeUnmount, useTemplateRef } from 'vue';
import { createAudioSpectrogram } from '@glitch/shared/utility/audio-spectrogram/audio-spectrogram.ts';
import GsDetachableView from './GsDetachableView.vue';
import type { SpectrogramSettings } from '@glitch/shared/utility/audio-spectrogram/audio-spectrogram.ts';
import { engine } from '@/app.ts';
import * as ui from '@/ui.ts';

const props = defineProps<{ options?: Partial<SpectrogramSettings> }>();

const options = computed<SpectrogramSettings>(() => ({
	channel: 'mix',
	fftSize: 2048,
	window: 'hann',
	smoothing: 0,
	minFrequency: 20,
	maxFrequency: 20000,
	logarithmic: false,
	minDb: -80,
	maxDb: 0,
	duration: 10,
	orientation: 'horizontal',
	direction: 'forward',
	flipFrequency: false,
	...props.options,
}));

const canvas = useTemplateRef('canvas');
let device: GPUDevice | undefined;
let context: GPUCanvasContext | null = null;
let spectrogram: ReturnType<typeof createAudioSpectrogram> | undefined;
let releaseCapture: (() => void) | undefined;
let observer: ResizeObserver | undefined;
let frame: number | undefined;
let frameWindow: Window | undefined;
let disposed = false;
let width = 0;
let height = 0;

function stop() {
	if (frame !== undefined) frameWindow?.cancelAnimationFrame(frame);
	frame = undefined;
	observer?.disconnect();
	releaseCapture?.();
	releaseCapture = undefined;
	spectrogram?.dispose();
	spectrogram = undefined;
	context?.unconfigure();
	device?.destroy();
	device = undefined;
}

function fail(error: unknown) {
	stop();
	if (!disposed) ui.alert({ type: 'error', title: 'Could not render audio spectrogram', text: String(error) });
}

function tick() {
	const element = canvas.value;
	if (disposed || !element || !device || !context || !spectrogram) return;
	try {
		if (width > 0 && height > 0 && !element.ownerDocument.hidden) {
			const ratio = element.ownerDocument.defaultView?.devicePixelRatio ?? 1;
			const limit = device.limits.maxTextureDimension2D;
			const pixelWidth = Math.max(1, Math.min(limit, Math.round(width * ratio)));
			const pixelHeight = Math.max(1, Math.min(limit, Math.round(height * ratio)));
			if (element.width !== pixelWidth) element.width = pixelWidth;
			if (element.height !== pixelHeight) element.height = pixelHeight;
			const encoder = device.createCommandEncoder();
			const pass = encoder.beginRenderPass({ colorAttachments: [{
				view: context.getCurrentTexture().createView(),
				loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1],
			}] });
			// 履歴の進行とFFTの間隔はPCMのサンプル時刻で決まり、描画FPSには依存しない。
			spectrogram.render(engine.audioOutputHistory, options.value, pass);
			pass.end();
			device.queue.submit([encoder.finish()]);
		}
		frameWindow = element.ownerDocument.defaultView ?? window;
		frame = frameWindow.requestAnimationFrame(tick);
	} catch (error) {
		fail(error);
	}
}

function restartFrame() {
	// 同じサイズの別ウィンドウへ移した場合も、停止中の旧ウィンドウのrAFを切り替える。
	if (frame !== undefined) frameWindow?.cancelAnimationFrame(frame);
	tick();
}

onMounted(async () => {
	try {
		const adapter = await navigator.gpu?.requestAdapter();
		if (disposed) return;
		if (!adapter) throw new Error('WebGPU is unavailable.');
		const createdDevice = await adapter.requestDevice();
		if (disposed) { createdDevice.destroy(); return; }
		device = createdDevice;
		void device.lost.then(info => {
			if (device === createdDevice && !disposed) fail(new Error(info.message));
		});
		context = canvas.value!.getContext('webgpu') as GPUCanvasContext | null;
		if (!context) throw new Error('Could not create a WebGPU canvas context.');
		context.configure({ device, format: navigator.gpu.getPreferredCanvasFormat(), alphaMode: 'opaque' });
		const vertex = device.createShaderModule({ code: `
struct VertexOut {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
};
@vertex fn vs(@builtin(vertex_index) index: u32) -> VertexOut {
	let positions = array(vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
		vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1));
	return VertexOut(vec4f(positions[index], 0, 1), positions[index]);
}` });
		spectrogram = createAudioSpectrogram(device, vertex);
		releaseCapture = engine.retainAudioOutputCapture();
		observer = new ResizeObserver(([entry]) => {
			width = entry.contentRect.width;
			height = entry.contentRect.height;
			restartFrame();
		});
		observer.observe(canvas.value!);
	} catch (error) {
		fail(error);
	}
});

onBeforeUnmount(() => { disposed = true; stop(); });
</script>

<style module lang="scss">
.root {
	position: relative;
	flex: 1;
	min-height: 0;
	height: 100%;
	overflow: clip;
}

.canvas {
	position: absolute;
	inset: 0;
	display: block;
	width: 100%;
	height: 100%;
}
</style>
