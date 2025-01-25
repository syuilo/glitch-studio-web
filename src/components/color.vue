<template>
<div class="color-component">
	<input type="color" :value="rgbToHex(color)" @change="change($event.target.value)"/>
</div>
</template>

<script lang="ts" setup>
import {} from 'vue';

defineProps<{
	color: number[];
}>();

const emit = defineEmits<{
	(ev: 'input', color: number[]): void;
}>();

function rgbToHex(rgb: number[]) {
	function componentToHex(c: number) {
		const hex = c.toString(16);
		return hex.length === 1 ? '0' + hex : hex;
	}

	return '#' + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);
}

function hexToRgb(hex: string) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)!;
	return [
		parseInt(result[1], 16),
		parseInt(result[2], 16),
		parseInt(result[3], 16),
	];
}

function change(color: string) {
	emit('input', hexToRgb(color));
}
</script>

<style scoped lang="scss">
.color-component {

}
</style>
