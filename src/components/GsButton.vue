<template>
<button
	ref="el" class="_button"
	:class="[$style.root, { [$style.inline]: inline, [$style.primary]: primary, [$style.gradate]: gradate, [$style.danger]: danger, [$style.rounded]: rounded, [$style.full]: full, [$style.small]: small, [$style.large]: large, [$style.transparent]: transparent }]"
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
	gradate?: boolean;
	rounded?: boolean;
	inline?: boolean;
	autofocus?: boolean;
	wait?: boolean;
	danger?: boolean;
	full?: boolean;
	small?: boolean;
	large?: boolean;
	transparent?: boolean;
}>();

const emit = defineEmits<{
	(ev: 'click', payload: MouseEvent): void;
}>();

let el = shallowRef<HTMLElement | null>(null);

onMounted(() => {
	if (props.autofocus) {
		nextTick(() => {
			el.value.focus();
		});
	}
});
</script>

<style lang="scss" module>
.root {
	position: relative;
	z-index: 1; // 他コンポーネントのbox-shadowに隠されないようにするため
	display: block;
	min-width: 100px;
	width: max-content;
	padding: 4px 6px;
	text-align: center;
	font-weight: normal;
	font-size: 95%;
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

	&.small {
		font-size: 90%;
		padding: 6px 12px;
	}

	&.large {
		font-size: 100%;
		padding: 8px 16px;
	}

	&.full {
		width: 100%;
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

	&.gradate {
		font-weight: bold;
		color: var(--fgOnAccent) !important;
		background: linear-gradient(90deg, var(--buttonGradateA), var(--buttonGradateB));

		&:not(:disabled):hover {
			background: linear-gradient(90deg, var(--X8), var(--X8));
		}

		&:not(:disabled):active {
			background: linear-gradient(90deg, var(--X8), var(--X8));
		}
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

	&.inline {
		display: inline-block;
		width: auto;
		min-width: 100px;
	}
}
</style>
