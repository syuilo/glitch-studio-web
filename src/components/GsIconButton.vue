<template>
<button
	class="_button"
	:class="[$style.root, { [$style.primary]: primary, [$style.danger]: danger, [$style.rounded]: rounded, [$style.transparent]: transparent }]"
	:type="type"
	@click="emit('click', $event)"
>
	<slot></slot>
</button>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, shallowRef } from 'vue';

const props = defineProps<{
	type?: 'button' | 'submit' | 'reset';
	primary?: boolean;
	rounded?: boolean;
	danger?: boolean;
	transparent?: boolean;
}>();

const emit = defineEmits<{
	(ev: 'click', payload: MouseEvent): void;
}>();
</script>

<style lang="scss" module>
.root {
	position: relative;
	z-index: 1; // 他コンポーネントのbox-shadowに隠されないようにするため
	display: block;
	width: var(--control-height);
	height: var(--control-height);
	padding: 0;
	line-height: 0;
	text-align: center;
	font-weight: normal;
	font-size: 12px;
	box-shadow: none;
	text-decoration: none;
	//background: #fff1;
	//border-radius: 5px;
	border: solid 1px rgba(0, 0, 0, 0.7);
	border-radius: 4px;
	background: linear-gradient(0deg, rgba(0, 0, 0, 0), rgba(255, 255, 255, 0.05));
	box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1), 0 1px 0 rgba(255, 255, 255, 0.1) inset;
	color: #fff;
	overflow: clip;
	box-sizing: border-box;
	transition: background 0.1s ease;

	> * {
		pointer-events: none;
	}

	&:not(:disabled):hover {
		background: linear-gradient(0deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.07));
	}

	&:not(:disabled):active {
		background: linear-gradient(180deg, rgba(0, 0, 0, 0), rgba(255, 255, 255, 0.05));
		box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1) inset;
	}

	&.rounded {
		border-radius: 999px;
	}

	&.primary {
		font-weight: bold;
		color: var(--fgOnAccent) !important;
		background: var(--accent);

		&:not(:disabled):hover {
			background: var(--accent);
		}

		&:not(:disabled):active {
			background: var(--accent);
		}
	}

	&.transparent {
		background: transparent;
	}

	&.danger {
		color: #ff2a2a;

		&.primary {
			color: #fff;
			background: #ff2a2a;

			&:not(:disabled):hover {
				background: #ff4242;
			}

			&:not(:disabled):active {
				background: #d42e2e;
			}
		}
	}

	&:disabled {
		opacity: 0.7;
	}

	&:focus-visible {
		outline: solid 2px var(--focus);
		outline-offset: 2px;
	}
}
</style>
