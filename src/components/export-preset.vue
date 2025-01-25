<template>
<XDialog>
	<div class="export-preset-componet">
		<div>
			<input type="text" v-model="name"/>
		</div>
		<footer>
			<button @click="cancel()">Cancel</button>
			<button class="primary" @click="save()">Export</button>
		</footer>
	</div>
</XDialog>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { SettingsStore } from '@/settings';
import { version } from '@/version';
import XDialog from './dialog.vue';
import { encode } from '@msgpack/msgpack';
import { useStore } from '@/store';
import { genId } from '@/utils';
import * as api from '@/api.js';

const store = useStore();

const emit = defineEmits<{
	(ev: 'ok'): void;
}>();

const name = ref('');

async function save() {
	const data = encode({
		id: genId(),
		gsVersion: version,
		name: name.value,
		nodes: store.nodes,
		macros: store.macros,
		assets: await api.encodeAssets(store.assets),
	});
	await api.saveFile({
		defaultPath: name.value,
		filters: [{
			name: 'Glitch Studio Preset',
			extensions: ['gsp']
		}]
	}, data);
	emit('ok');
}

function cancel() {
	emit('ok');
}
</script>

<style scoped lang="scss">
.export-preset-componet {
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
