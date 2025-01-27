<template>
<div class="xy-slider-component">
	<div>
		<XSlider v-model="x" :step="step" :min="min" :max="max" class="slider" :continuous-update="true"/>
		<GsIconButton @click="keepAspectRatio = !keepAspectRatio" class="keep" :primary="keepAspectRatio"><Fa :icon="faLink"/></GsIconButton>
		<XSlider v-model="y" :step="step" :min="min" :max="max" class="slider" :continuous-update="true"/>
	</div>
</div>
</template>

<script lang="ts" setup>
import { onMounted, ref, shallowRef, watch } from 'vue';
import XSlider from './slider.vue';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import GsIconButton from './GsIconButton.vue';

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
const keepAspectRatio = ref(true);

watch(x, () => {
	if (keepAspectRatio.value) {
		y.value = x.value;
	}
	emit('update:modelValue', [x.value, y.value]);
});

watch(y, () => {
	if (keepAspectRatio.value) {
		x.value = y.value;
	}
	emit('update:modelValue', [x.value, y.value]);
});
</script>

<style scoped lang="scss">
.xy-slider-component {
	position: relative;

	> div {
		display: flex;
		gap: 8px;

		> .slider {
			flex: 1;
		}

		> .keep {
			flex-grow: 0;
		}
	}
}
</style>
