<template>
<div ref="preview" :class="[$style.root, { [$style.disabled]: disabled }]" tabindex="0" @click="open" @keydown.enter.prevent="open" @keydown.space.prevent="open">
	<div :class="$style.color" :style="{ background: colorCss(modelValue) }"></div>
</div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, useTemplateRef, watch } from 'vue';
import type { RgbaColor } from '@/utility/color-input.ts';
import { colorCss } from '@/utility/color-input.ts';
import GsColorPicker from '@/components/common/GsColorPicker.vue';
import * as ui from '@/ui.ts';

const props = defineProps<{
	modelValue: RgbaColor;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	(ev: 'update:modelValue', value: RgbaColor): void;
	(ev: 'beginChanging'): void;
	(ev: 'changeFinished'): void;
}>();

const preview = useTemplateRef('preview');
let dispose: (() => void) | undefined;
let changing = false;

function close() {
	dispose?.();
	dispose = undefined;
	if (changing) {
		changing = false;
		emit('changeFinished');
	}
}

function open() {
	if (props.disabled || dispose || !preview.value) return;
	dispose = ui.popup(GsColorPicker, {
		modelValue: computed(() => props.modelValue),
		anchorElement: preview.value,
	}, {
		'update:modelValue': value => {
			if (!changing) {
				changing = true;
				emit('beginChanging');
			}
			emit('update:modelValue', value);
		},
		closed: () => {
			close();
			preview.value?.focus({ preventScroll: true });
		},
	}).dispose;
}

watch(() => props.disabled, disabled => { if (disabled) close(); });
onBeforeUnmount(close);
</script>

<style module lang="scss">
.root {
	display: inline-block;
	width: 48px;
	height: 28px;
	border: 1px solid var(--THEME-divider);
	border-radius: 6px;
	overflow: hidden;
	cursor: pointer;
	vertical-align: middle;
	background: repeating-conic-gradient(#888 0% 25%, #ccc 0% 50%) 0 / 12px 12px;
}
.color { width: 100%; height: 100%; }
.disabled { opacity: 0.5; cursor: default; }
</style>
