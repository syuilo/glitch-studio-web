<template>
<div class="wh-component">
	<input type="number" :value="w" @change="change('w', parseInt($event.target.value, 10))"/>
	<input type="number" :value="h" @change="change('h', parseInt($event.target.value, 10))"/>
</div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps<{
	wh: [number, number];
}>();

const emit = defineEmits<{
	(ev: 'input', wh: [number, number]): void;
}>();

const w = computed(() => props.wh[0]);
const h = computed(() => props.wh[1]);

function change(wh: string, value: number) {
	emit('input', [
		wh === 'w' ? value : w.value,
		wh === 'h' ? value : h.value,
	]);
}
</script>

<style scoped lang="scss">
.wh-component {
	display: flex;

	> *:first-child {
		margin-right: 4px;
	}
}
</style>
