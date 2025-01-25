<template>
<div class="slider-component" ref="rootEl">
	<div class="track" ref="trackEl"></div>
	<div class="indicator" ref="indicatorEl"></div>
	<div class="thumb" ref="thumbA" @mousedown="onMousedown('a')"></div>
	<div class="thumb" ref="thumbB" @mousedown="onMousedown('b')"></div>
</div>
</template>

<script lang="ts" setup>
import { computed, ref, shallowRef, watch, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps<{
	modelValue: [number, number];
	step?: number;
	min: number;
	max: number;
}>();

const emit = defineEmits<{
	(ev: 'update:modelValue', value: number[]): void;
}>();

const rootEl = shallowRef<HTMLDivElement>();
const trackEl = shallowRef<HTMLDivElement>();
const indicatorEl = shallowRef<HTMLDivElement>();
const thumbA = shallowRef<HTMLDivElement>();
const thumbB = shallowRef<HTMLDivElement>();
const aDragging = ref(false);
const bDragging = ref(false);
const range = props.max - props.min;
const a = ref((props.modelValue[0] - props.min) / range);
const b = ref((props.modelValue[1] - props.min) / range);

const v = computed(() => {
	const min = Math.min(a.value, b.value);
	const max = Math.max(a.value, b.value);
	const range = props.max - props.min;
	return [(min * range) + props.min, (max * range) + props.min];
});

watch(() => props.modelValue, () => {
	const range = props.max - props.min;
	a.value = (props.modelValue[0] - props.min) / range;
	b.value = (props.modelValue[1] - props.min) / range;
	render();
});

function render() {
	if (indicatorEl.value && trackEl.value && thumbA.value && thumbB.value) {
		indicatorEl.value.style.left = (Math.min(a.value, b.value) * trackEl.value.clientWidth) + 'px';
		indicatorEl.value.style.width = ((Math.max(a.value, b.value) - Math.min(a.value, b.value)) * 100) + '%';

		const thumbSize = 20;
		const ax = Math.min(a.value, b.value) * (trackEl.value.clientWidth - thumbSize);
		const bx = Math.max(a.value, b.value) * (trackEl.value.clientWidth - thumbSize);
		thumbA.value.style.left = ax + 'px';
		thumbB.value.style.left = bx + 'px';
	}
}

function onMousedown(ab: string) {
	if (ab === 'a') aDragging.value = true;
	if (ab === 'b') bDragging.value = true;
}

function onMouseup() {
	//if (aDragging.value || bDragging.value) emit('change', v.value);
	aDragging.value = false;
	bDragging.value = false;
}

function onMousemove(e: MouseEvent) {
	if (!aDragging.value && !bDragging.value) return;
	const trackRect = trackEl.value!.getBoundingClientRect();
	const thumbSize = 20;
	const x = Math.max(0, Math.min(trackRect.width - thumbSize, (e.pageX - (thumbSize / 2)) - trackRect.left));
	const _v = (x / (trackRect.width - thumbSize));

	if (aDragging.value) {
		a.value = _v;
	} else {
		b.value = _v;
	}

	render();
	emit('update:modelValue', v.value);
}

const resizeObserver = new window.ResizeObserver(render);

onMounted(() => {
	render();

	resizeObserver.observe(rootEl.value!);

	document.addEventListener('mousemove', onMousemove);
	document.addEventListener('mouseup', onMouseup);
});

onBeforeUnmount(() => {
	resizeObserver.disconnect();
	document.removeEventListener('mousemove', onMousemove);
	document.removeEventListener('mouseup', onMouseup);
});
</script>

<style scoped lang="scss">
.slider-component {
	position: relative;

	.track {
		height: 4px;
		width: 100%;
		background: #111;
		border-bottom: solid 1px rgba(255, 255, 255, 0.12);
		border-radius: 4px;
		margin: 10px 0 10px 0;
	}

	.thumb {
		position: absolute;
		top: -8px;
		z-index: 1;
		border: solid 1px rgba(0, 0, 0, 0.7);
		background: linear-gradient(0deg, #1b1b1b, #2a2a2a);
		box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1), 0 1px 0 rgba(255, 255, 255, 0.1) inset;
		height: 20px;
		width: 20px;
		border-radius: 20px;
		cursor: ew-resize;
		margin-top: 0px;

		&:hover {
			background: linear-gradient(0deg, #252525, #303030);
		}
	}

	.indicator {
		position: absolute;
		top: 1px;
		left: 0;
		height: 2px;
		background: var(--accent);
		border-radius: 2px;
		pointer-events: none;
	}
}
</style>
