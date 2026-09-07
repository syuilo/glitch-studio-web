<template>
<div :class="$style.root">
	<GsRange v-model="x" :step="step" :min="min" :max="max" :class="$style.slider" :continuous-update="true"/>
	<GsRange v-model="y" :step="step" :min="min" :max="max" :class="$style.slider" :continuous-update="true"/>
</div>
</template>

<script lang="ts" setup>
import { onMounted, ref, shallowRef, watch } from 'vue';
import GsRange from './GsRange.vue';

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

const x = ref(props.modelValue[0]);
const y = ref(props.modelValue[1]);

watch(x, () => {
	emit('update:modelValue', [x.value, y.value]);
});

watch(y, () => {
	emit('update:modelValue', [x.value, y.value]);
});
</script>

<style module lang="scss">
.root {
	position: relative;
	display: flex;
	gap: 8px;
}

.slider {
	flex: 1;
}

.keep {
	flex-grow: 0;
}
</style>
