<template>
<XDialog>
	<div class="input-dialog-componet">
		<div>
			<input type="text" v-model="value" ref="inputEl"/>
		</div>
		<footer>
			<button @click="cancel()">Cancel</button>
			<button class="primary" @click="ok()">OK</button>
		</footer>
	</div>
</XDialog>
</template>

<script lang="ts" setup>
import { onMounted, nextTick, shallowRef, ref } from 'vue';
import XDialog from './dialog.vue';

const emit = defineEmits<{
	(ev: 'ok', value: string): void;
	(ev: 'cancel'): void;
}>();

const inputEl = shallowRef<HTMLInputElement>();
const value = ref('');

function ok() {
	emit('ok', value.value);
}

function cancel() {
	emit('cancel');
}

onMounted(() => {
	nextTick(() => {
		inputEl.value!.focus();
	});
});
</script>

<style scoped lang="scss">
.input-dialog-componet {
	> div {
		margin: 0 0 16px 0;
	}

	> footer {
		display: flex;
		margin-top: 24px;

		> button:first-child {
			margin-right: 16px;
		}
	}
}
</style>
