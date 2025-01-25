<template>
<div class="xy-component">
	<input type="number" :value="x" @change="change('x', parseInt($event.target.value, 10))"/>
	<input type="number" :value="y" @change="change('y', parseInt($event.target.value, 10))"/>
</div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps<{
	xy: [number, number];
}>();

const emit = defineEmits<{
	(ev: 'input', xy: [number, number]): void;
}>();

const x = computed(() => props.xy[0]);
const y = computed(() => props.xy[1]);

function change(xy: string, value: number) {
	emit('input', [
		xy === 'x' ? value : x.value,
		xy === 'y' ? value : y.value,
	]);
}
</script>

<style scoped lang="scss">
.xy-component {
	display: flex;

	> *:first-child {
		margin-right: 4px;
	}
}
</style>
