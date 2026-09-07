<template>
<div :class="$style.root">
	<div
		ref="surface"
		:class="[$style.surface, {
			[$style.lockedX]: axisLock === 'x',
			[$style.lockedY]: axisLock === 'y',
		}]"
		tabindex="0"
		role="group"
		:aria-label="`X ${formatValue(value[0])}, Y ${formatValue(value[1])}`"
		@keydown="onKeydown"
		@pointerdown="onPointerDown"
		@pointermove="onPointerMove"
		@pointerup="onPointerUp"
		@pointercancel="onPointerUp"
	>
		<div :class="$style.horizontalGuide" :style="{ top: yPosition }"></div>
		<div :class="$style.verticalGuide" :style="{ left: xPosition }"></div>
		<div :class="$style.point" :style="{ left: xPosition, top: yPosition }"></div>
	</div>
	<div :class="$style.side">
		<div :class="$style.values">
			<span><b>X</b> {{ formatValue(value[0]) }}</span>
			<span><b>Y</b> {{ formatValue(value[1]) }}</span>
		</div>
		<div :class="$style.locks">
			<GsButton small :primary="axisLock === 'x'" :aria-pressed="axisLock === 'x'" title="X axis" @click="toggleAxisLock('x')">X</GsButton>
			<GsButton small :primary="axisLock === 'y'" :aria-pressed="axisLock === 'y'" title="Y axis" @click="toggleAxisLock('y')">Y</GsButton>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, ref, useTemplateRef, watch } from 'vue';
import GsButton from './GsButton.vue';

const props = withDefaults(defineProps<{
	modelValue: [number, number];
	step?: number;
	min?: number;
	max: number;
}>(), {
	min: 0,
});

const emit = defineEmits<{
	(ev: 'update:modelValue', value: [number, number]): void;
}>();

type AxisLock = 'x' | 'y' | null;

const surface = useTemplateRef<HTMLElement>('surface');
const value = ref<[number, number]>([...props.modelValue]);
const axisLock = ref<AxisLock>(null);
const activePointerId = ref<number | null>(null);

const xPosition = computed(() => `${toRatio(value.value[0]) * 100}%`);
const yPosition = computed(() => `${(1 - toRatio(value.value[1])) * 100}%`);

watch(() => props.modelValue, (newValue) => {
	value.value = [...newValue];
}, { deep: true });

function toRatio(number: number): number {
	if (props.max === props.min) return 0;
	return Math.min(1, Math.max(0, (number - props.min) / (props.max - props.min)));
}

function snap(number: number): number {
	const clamped = Math.min(props.max, Math.max(props.min, number));
	if (props.step == null || props.step <= 0) return clamped;
	const snapped = props.min + Math.round((clamped - props.min) / props.step) * props.step;
	return Number(Math.min(props.max, Math.max(props.min, snapped)).toFixed(10));
}

function setValue(x: number, y: number) {
	value.value = [snap(x), snap(y)];
	emit('update:modelValue', value.value);
}

function updateFromPointer(event: PointerEvent) {
	if (surface.value == null) return;
	const bounds = surface.value.getBoundingClientRect();
	const x = props.min + Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)) * (props.max - props.min);
	const y = props.min + (1 - Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))) * (props.max - props.min);
	setValue(axisLock.value === 'y' ? value.value[0] : x, axisLock.value === 'x' ? value.value[1] : y);
}

function onPointerDown(event: PointerEvent) {
	if (event.button !== 0) return;
	activePointerId.value = event.pointerId;
	surface.value?.setPointerCapture(event.pointerId);
	updateFromPointer(event);
}

function onPointerMove(event: PointerEvent) {
	if (activePointerId.value !== event.pointerId) return;
	updateFromPointer(event);
}

function onPointerUp(event: PointerEvent) {
	if (activePointerId.value !== event.pointerId) return;
	updateFromPointer(event);
	activePointerId.value = null;
	if (surface.value?.hasPointerCapture(event.pointerId)) surface.value.releasePointerCapture(event.pointerId);
}

function onKeydown(event: KeyboardEvent) {
	const amount = props.step ?? (props.max - props.min) / 100;
	if (event.key === 'ArrowLeft' && axisLock.value !== 'y') setValue(value.value[0] - amount, value.value[1]);
	else if (event.key === 'ArrowRight' && axisLock.value !== 'y') setValue(value.value[0] + amount, value.value[1]);
	else if (event.key === 'ArrowDown' && axisLock.value !== 'x') setValue(value.value[0], value.value[1] - amount);
	else if (event.key === 'ArrowUp' && axisLock.value !== 'x') setValue(value.value[0], value.value[1] + amount);
	else return;
	event.preventDefault();
}

function toggleAxisLock(axis: Exclude<AxisLock, null>) {
	axisLock.value = axisLock.value === axis ? null : axis;
}

function formatValue(number: number): string {
	return Number(number.toFixed(10)).toString();
}
</script>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.surface {
	position: relative;
	width: 100%;
	aspect-ratio: 1;
	overflow: hidden;
	box-sizing: border-box;
	border: 1px solid var(--THEME-buttonHoverBg);
	border-radius: 5px;
	background-color: var(--THEME-workspacePanelBody);
	background-image:
		linear-gradient(to right, color-mix(in srgb, var(--THEME-fg) 12%, transparent) 1px, transparent 1px),
		linear-gradient(to bottom, color-mix(in srgb, var(--THEME-fg) 12%, transparent) 1px, transparent 1px);
	background-size: 25% 25%;
	cursor: crosshair;
	touch-action: none;
	user-select: none;

	&.lockedX {
		cursor: ew-resize;
	}

	&.lockedY {
		cursor: ns-resize;
	}

	&:focus-visible {
		outline: 2px solid var(--THEME-accent);
		outline-offset: 2px;
	}
}

.horizontalGuide,
.verticalGuide {
	position: absolute;
	pointer-events: none;
	background: color-mix(in srgb, var(--THEME-accent) 45%, transparent);
}

.horizontalGuide {
	left: 0;
	width: 100%;
	height: 1px;
}

.verticalGuide {
	top: 0;
	width: 1px;
	height: 100%;
}

.point {
	position: absolute;
	width: 14px;
	height: 14px;
	box-sizing: border-box;
	border-radius: 50%;
	background: var(--THEME-accent);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--THEME-accent) 25%, transparent);
	transform: translate(-50%, -50%);
	pointer-events: none;
}

.side,
.values,
.locks {
	display: flex;
	align-items: center;
}

.side {
	justify-content: space-between;
	gap: 8px;
}

.values {
	min-width: 0;
	gap: 12px;
	font-variant-numeric: tabular-nums;

	b {
		color: var(--THEME-accent);
	}
}

.locks {
	gap: 4px;

	button {
		min-width: 32px !important;
	}
}
</style>
