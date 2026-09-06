<template>
<div class="xy-slider-component">
	<div>
		<GsRange v-model="x" :step="step" :min="min" :max="max" class="slider" :continuous-update="true"/>
		<GsButton @click="keepAspectRatio = !keepAspectRatio" class="keep" :primary="keepAspectRatio"><i class="ti ti-link"></i></GsButton>
		<GsRange v-model="y" :step="step" :min="min" :max="max" class="slider" :continuous-update="true"/>
	</div>
</div>
</template>

<script lang="ts" setup>
import { onMounted, ref, shallowRef, watch } from 'vue';
import GsRange from './common/GsRange.vue';
import GsButton from './common/GsButton.vue';

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
