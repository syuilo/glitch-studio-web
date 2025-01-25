<template>
<div ref="container" :class="[$style.input, { [$style.opening]: opening, [$style.disabled]: disabled, [$style.focused]: focused }]" @mousedown.prevent="show">
	<div :class="$style.label">
		{{ label }}
	</div>
	<div ref="suffixEl" :class="$style.suffix"><Fa :icon="opening ? faChevronUp : faChevronDown"/></div>
</div>
</template>

<script lang="ts" setup>
import { popupMenu } from '@/app';
import { onMounted, nextTick, ref, watch, computed, toRefs, VNode, useSlots } from 'vue';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

const props = defineProps<{
	modelValue: string | null;
	required?: boolean;
	readonly?: boolean;
	disabled?: boolean;
	placeholder?: string;
	autofocus?: boolean;
	inline?: boolean;
}>();

const emit = defineEmits<{
	(ev: 'change', _ev: KeyboardEvent): void;
	(ev: 'update:modelValue', value: string | null): void;
}>();

const slots = useSlots();

const { modelValue, autofocus } = toRefs(props);
const v = ref(modelValue.value);
const focused = ref(false);
const opening = ref(false);
const changed = ref(false);
const label = ref(null);
const filled = computed(() => v.value !== '' && v.value != null);
const prefixEl = ref(null);
const suffixEl = ref(null);
const container = ref(null);

const updated = () => {
	changed.value = false;
	emit('update:modelValue', v.value);

	nextTick(() => {
		scanOptions(slots.default!());
	});
};

watch(modelValue, newValue => {
	v.value = newValue;
});

watch(v, newValue => {
	updated();
});

const scanOptions = (options: VNode[]) => {
	for (const vnode of options) {
		if (vnode.type === 'optgroup') {
			const optgroup = vnode;
			scanOptions(optgroup.children);
		} else if (Array.isArray(vnode.children)) { // 何故かフラグメントになってくることがある
			const fragment = vnode;
			scanOptions(fragment.children);
		} else if (vnode.props == null) { // v-if で条件が false のときにこうなる
			// nop?
		} else {
			const option = vnode;
			if (option.props.value === modelValue.value) {
				label.value = option.children;
			}
		}
	}
};

onMounted(() => {
	nextTick(() => {
		if (autofocus.value) {
			focus();
		}
	});

	scanOptions(slots.default!());
});

function show(ev: MouseEvent) {
	focused.value = true;
	opening.value = true;

	const menu = [];
	let options = slots.default!();

	const pushOption = (option: VNode) => {
		menu.push({
			text: option.children,
			active: computed(() => v.value === option.props.value),
			action: () => {
				v.value = option.props.value;
			},
		});
	};

	const scanOptions = (options: VNode[]) => {
		for (const vnode of options) {
			if (vnode.type === 'optgroup') {
				const optgroup = vnode;
				menu.push({
					type: 'label',
					text: optgroup.props.label,
				});
				scanOptions(optgroup.children);
			} else if (Array.isArray(vnode.children)) { // 何故かフラグメントになってくることがある
				const fragment = vnode;
				scanOptions(fragment.children);
			} else if (vnode.props == null) { // v-if で条件が false のときにこうなる
				// nop?
			} else {
				const option = vnode;
				pushOption(option);
			}
		}
	};

	scanOptions(options);

	popupMenu(menu, container.value, {
		width: container.value.offsetWidth,
		onClosing: () => {
			opening.value = false;
		},
	}).then(() => {
		focused.value = false;
	});
}
</script>

<style lang="scss" module>
.input {
	display: flex;
	height: var(--control-height);
	line-height: var(--control-height);
	width: 100%;
	padding: 0 8px;
	margin: 0;
	border: solid 1px rgba(0, 0, 0, 0.7);
	border-radius: 4px;
	background: linear-gradient(0deg, rgba(0, 0, 0, 0), rgba(255, 255, 255, 0.05));
	box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1), 0 1px 0 rgba(255, 255, 255, 0.1) inset;
	color: #fff;
	font-weight: normal;
	font-size: 1em;
	outline: none;
	box-sizing: border-box;
	transition: border-color 0.1s ease-out;
	cursor: pointer;
	user-select: none;
	white-space: nowrap;
  overflow: clip;

	&:not(:disabled):hover {
		background: linear-gradient(0deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.07));
	}

	&:not(:disabled).opening,
	&:not(:disabled):active {
		background: linear-gradient(180deg, rgba(0, 0, 0, 0), rgba(255, 255, 255, 0.05));
		box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1) inset;
	}
}

.suffix {
	font-size: 10px;
	margin-left: 4px;
}

.chevron {
	transition: transform 0.1s ease-out;
}

.chevronOpening {
	transform: rotateX(180deg);
}

.label {
	flex: 1;
	overflow: clip;
	text-overflow: ellipsis;
}
</style>
