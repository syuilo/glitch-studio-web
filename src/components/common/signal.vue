<template>
<div class="signal-component">
	<GsButton @click="change('r')" :primary="r">R</GsButton>
	<GsButton @click="change('g')" :primary="g">G</GsButton>
	<GsButton @click="change('b')" :primary="b">B</GsButton>
</div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import GsButton from './GsButton.vue';

const props = defineProps<{
	signal: [boolean, boolean, boolean];
}>();

const emit = defineEmits<{
	(ev: 'input', signal: [boolean, boolean, boolean]): void;
}>();

const r = computed(() => props.signal[0]);
const g = computed(() => props.signal[1]);
const b = computed(() => props.signal[2]);

function change(color: string) {
	emit('input', [
		color === 'r' ? !r.value : r.value,
		color === 'g' ? !g.value : g.value,
		color === 'b' ? !b.value : b.value,
	]);
}
</script>

<style scoped lang="scss">
.signal-component {
	display: flex;
	
	> *:nth-child(2) {
		margin: 0 8px;
	}
}
</style>
