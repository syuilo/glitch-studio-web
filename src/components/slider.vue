<template>
<div class="timctyfi" :class="{ disabled, easing }">
	<div ref="containerEl" class="container">
		<div class="track">
			<div class="highlight right" :style="{ width: ((steppedRawValue - minRatio) * 100) + '%', left: (Math.abs(min) / (max + Math.abs(min))) * 100 + '%' }">
				<div class="shine right"></div>
			</div>
			<div class="highlight left" :style="{ width: ((minRatio - steppedRawValue) * 100) + '%', left: (steppedRawValue) * 100 + '%' }">
				<div class="shine left"></div>
			</div>
		</div>
		<div v-if="steps && showTicks" class="ticks">
			<div v-for="i in (steps + 1)" class="tick" :style="{ left: (((i - 1) / steps) * 100) + '%' }"></div>
		</div>
		<div class="zeroPointTrack">
			<div class="zeroPoint" :style="{ left: (Math.abs(min) / (max + Math.abs(min))) * 100 + '%' }"></div>
		</div>
		<div
			ref="thumbEl"
			class="thumb"
			:class="{ dragging }"
			:style="{ left: thumbPosition + 'px' }"
			@mouseenter.passive="onMouseenter"
			@mousedown="onMousedown"
			@touchstart="onMousedown"
		></div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { popup } from '@/app';
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';

const props = withDefaults(defineProps<{
	modelValue: number;
	disabled?: boolean;
	min: number;
	max: number;
	step?: number;
	textConverter?: (value: number) => string,
	showTicks?: boolean;
	easing?: boolean;
	continuousUpdate?: boolean;
}>(), {
	min: 0,
	step: 1,
	textConverter: (v: number) => (Math.round(v * 1000) / 1000).toString(),
	showTicks: false,
	easing: false,
});

const emit = defineEmits<{
	(ev: 'update:modelValue', value: number): void;
	(ev: 'dragEnded', value: number): void;
}>();

const containerEl = shallowRef<HTMLElement>();
const thumbEl = shallowRef<HTMLElement>();

const dragging = ref(false);

const maxRatio = computed(() => Math.abs(props.max) / (props.max + Math.abs(props.min)));
const minRatio = computed(() => Math.abs(props.min) / (props.max + Math.abs(props.min)));

const rawValue = ref((props.modelValue - props.min) / (props.max - props.min));
watch(() => props.modelValue, () => {
	rawValue.value = (props.modelValue - props.min) / (props.max - props.min);
});
const steppedRawValue = computed(() => {
	if (props.step) {
		const step = props.step / (props.max - props.min);
		return (step * Math.round(rawValue.value / step));
	} else {
		return rawValue.value;
	}
});
const finalValue = computed(() => {
	if (Number.isInteger(props.step)) {
		return Math.round((steppedRawValue.value * (props.max - props.min)) + props.min);
	} else {
		return (steppedRawValue.value * (props.max - props.min)) + props.min;
	}
});

const getThumbWidth = () => {
	if (thumbEl.value == null) return 0;
	return thumbEl.value!.offsetWidth;
};
const thumbPosition = ref(0);
const calcThumbPosition = () => {
	if (containerEl.value == null) {
		thumbPosition.value = 0;
	} else {
		thumbPosition.value = (containerEl.value.offsetWidth - getThumbWidth()) * steppedRawValue.value;
	}
};
watch([steppedRawValue, containerEl], calcThumbPosition);

let ro: ResizeObserver | undefined;

onMounted(() => {
	ro = new ResizeObserver((entries, observer) => {
		calcThumbPosition();
	});
	if (containerEl.value) ro.observe(containerEl.value);
});

onUnmounted(() => {
	if (ro) ro.disconnect();
});

const steps = computed(() => {
	if (props.step) {
		return (props.max - props.min) / props.step;
	} else {
		return 0;
	}
});

const tooltipForDragShowing = ref(false);
const tooltipForHoverShowing = ref(false);

function onMouseenter() {
	//if (isTouchUsing) return;

	tooltipForHoverShowing.value = true;

	const { dispose } = popup(defineAsyncComponent(() => import('@/components/GsTooltip.vue')), {
		showing: computed(() => tooltipForHoverShowing.value && !tooltipForDragShowing.value),
		text: computed(() => {
			return props.textConverter(finalValue.value);
		}),
		targetElement: thumbEl,
	}, {
		closed: () => dispose(),
	});

	thumbEl.value!.addEventListener('mouseleave', () => {
		tooltipForHoverShowing.value = false;
	}, { once: true, passive: true });
}

function onMousedown(ev: MouseEvent | TouchEvent) {
	ev.preventDefault();

	dragging.value = true;
	tooltipForDragShowing.value = true;

	const { dispose } = popup(defineAsyncComponent(() => import('@/components/GsTooltip.vue')), {
		showing: tooltipForDragShowing,
		text: computed(() => {
			return props.textConverter(finalValue.value);
		}),
		targetElement: thumbEl,
	}, {
		closed: () => dispose(),
	});

	const style = document.createElement('style');
	style.appendChild(document.createTextNode('* { cursor: grabbing !important; } body * { pointer-events: none !important; }'));
	document.head.appendChild(style);

	const thumbWidth = getThumbWidth();

	const onDrag = (ev: MouseEvent | TouchEvent) => {
		ev.preventDefault();
		const containerRect = containerEl.value!.getBoundingClientRect();
		const pointerX = 'touches' in ev && ev.touches.length > 0 ? ev.touches[0].clientX : 'clientX' in ev ? ev.clientX : 0;
		const pointerPositionOnContainer = pointerX - (containerRect.left + (thumbWidth / 2));
		rawValue.value = Math.min(1, Math.max(0, pointerPositionOnContainer / (containerEl.value!.offsetWidth - thumbWidth)));

		if (props.continuousUpdate) {
			emit('update:modelValue', finalValue.value);
		}
	};

	let beforeValue = finalValue.value;

	const onMouseup = () => {
		document.head.removeChild(style);
		dragging.value = false;
		tooltipForDragShowing.value = false;
		window.removeEventListener('mousemove', onDrag);
		window.removeEventListener('touchmove', onDrag);
		window.removeEventListener('mouseup', onMouseup);
		window.removeEventListener('touchend', onMouseup);

		// 値が変わってたら通知
		if (beforeValue !== finalValue.value) {
			emit('update:modelValue', finalValue.value);
			emit('dragEnded', finalValue.value);
		}
	};

	window.addEventListener('mousemove', onDrag);
	window.addEventListener('touchmove', onDrag);
	window.addEventListener('mouseup', onMouseup, { once: true });
	window.addEventListener('touchend', onMouseup, { once: true });
}
</script>

<style lang="scss" scoped>
@use "sass:math";

.timctyfi {
	position: relative;

	$thumbHeight: 20px;
	$thumbWidth: 20px;

	> .container {
		position: relative;
		height: $thumbHeight;

		> .track {
			position: absolute;
			top: 0;
			bottom: 0;
			left: 0;
			right: 0;
			margin: auto;
			width: calc(100% - #{$thumbWidth});
			height: 3px;
			background: #0007;
			border-radius: 999px;
			box-shadow: 0 1px 0 0 #fff1, 0 -1px 0 0 #0005;
			overflow: clip;

			> .highlight {
				position: absolute;
				top: 0;
				height: 100%;
				background: color(from var(--accent) srgb r g b / 0.5);
				overflow: clip;

				> .shine {
					position: absolute;
					top: 0;
					width: 64px;
					height: 100%;
				}
			}

			> .highlight.right {
				> .shine.right {
					right: calc(#{$thumbWidth} / 2);
					background: linear-gradient(-90deg, var(--accent), color(from var(--accent) srgb r g b / 0));
				}
			}

			> .highlight.left {
				> .shine.left {
					left: calc(#{$thumbWidth} / 2);
					background: linear-gradient(90deg, var(--accent), color(from var(--accent) srgb r g b / 0));
				}
			}
		}

		> .zeroPointTrack {
			position: absolute;
			top: 0;
			bottom: 0;
			left: 0;
			right: 0;
			margin: auto;
			width: calc(100% - #{$thumbWidth});
			pointer-events: none;

			> .zeroPoint {
				position: absolute;
				top: 0;
				bottom: 0;
				width: 7px;
				height: 7px;
				margin-left: -3px;
				margin-top: auto;
				margin-bottom: auto;
				background: var(--accent);
				border-radius: 999px;
				opacity: 0.5;
			}
		}

		> .ticks {
			$tickWidth: 3px;

			position: absolute;
			top: 0;
			bottom: 0;
			left: 0;
			right: 0;
			margin: auto;
			width: calc(100% - #{$thumbWidth});

			> .tick {
				position: absolute;
				bottom: 0;
				width: $tickWidth;
				height: 3px;
				margin-left: - math.div($tickWidth, 2);
				background: #fff5;
				border-radius: 999px;
			}
		}

		> .thumb {
			position: absolute;
			width: $thumbWidth;
			height: $thumbHeight;
			cursor: grab;
			background: #333;
			border-radius: 999px;
			box-shadow: 0 0 6px 0px rgba(0, 0, 0, 1);

			&::before {
				content: '';
				position: absolute;
				top: 3px;
				bottom: 3px;
				left: 3px;
				right: 3px;
				background: var(--accent);
				border-radius: 999px;
			}

			&::after {
				content: '';
				position: absolute;
				top: 6px;
				bottom: 6px;
				left: 6px;
				right: 6px;
				background: #333;
				border-radius: 999px;
			}

			&:hover, &.dragging {
				&::before {
					background: #fff;
				}
			}
		}
	}

	&.easing {
		> .container {
			> .track {
				> .highlight {
					transition: width 0.2s cubic-bezier(0, 0, 0, 1);
				}
			}

			> .thumb {
				transition: left 0.2s cubic-bezier(0, 0, 0, 1);
			}
		}
	}
}
</style>
