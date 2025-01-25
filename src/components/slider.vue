<template>
<div class="slider-component">
	<div class="indicator" ref="indicatorEl"></div>
	<input type="range"
		:value="modelValue"
		:step="step ?? 1"
		:min="min"
		:max="max"
		:title="`${min} ~ ${max}`"
		@input="onInput(parseFloat($event.target.value))"
		@change="emit('change', parseFloat($event.target.value))"/>
</div>
</template>

<script lang="ts" setup>
import { onMounted, ref, shallowRef, watch } from 'vue';

const props = withDefaults(defineProps<{
	modelValue: number;
	step?: number;
	min?: number;
	max: number;
}>(), {
	min: 0,
});

const emit = defineEmits<{
	(ev: 'update:modelValue', value: number): void;
}>();

const indicatorEl = shallowRef<HTMLDivElement>();
const v = ref(0);

watch(() => props.modelValue, () => {
	v.value = props.modelValue;
	render();
});

onMounted(() => {
	v.value = props.modelValue;
	render();
});

function render() {
	if (indicatorEl.value) {
		indicatorEl.value.style.width = ((v.value - props.min) / (props.max - props.min) * 100) + '%';
	}
}

function onInput(_v: number) {
	v.value = _v;
	render();
	emit('update:modelValue', _v);
}
</script>

<style scoped lang="scss">
.slider-component {
	position: relative;

	.indicator {
		position: absolute;
		top: 11px;
		left: 0;
		height: 2px;
		background: var(--accent);
		border-radius: 2px;
		pointer-events: none;
	}
}
</style>
