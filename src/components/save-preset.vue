<template>
<XDialog>
	<div class="save-preset-componet">
		<div>
			<input type="text" v-model="name"/>
		</div>
		<footer>
			<button @click="cancel()">Cancel</button>
			<button class="primary" @click="save()">Save</button>
		</footer>
	</div>
</XDialog>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { SettingsStore } from '@/settings';
import { version } from '@/version';
import XDialog from './dialog.vue';
import { subStore } from '@/sub-store';
import { useStore } from '@/store';
import { genId } from '@/utils';

const store = useStore();

const emit = defineEmits<{
	(ev: 'ok'): void;
}>();

const name = ref('');

function save() {
	subStore.settingsStore.settings.presets.push({
		id: genId(),
		gsVersion: version,
		name: name.value,
		author: '',
		nodes: store.nodes,
		macros: store.macros,
		assets: store.assets,
	});
	subStore.settingsStore.save();
	emit('ok');
}

function cancel() {
	emit('ok');
}
</script>

<style scoped lang="scss">
.save-preset-componet {
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
