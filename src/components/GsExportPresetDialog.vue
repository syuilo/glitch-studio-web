<template>
<GsModal ref="modal" preferType="dialog" @closed="emit('closed')">
	<div>
		<div>
			<input type="text" v-model="name"/>
		</div>
		<footer>
			<button @click="cancel()">Cancel</button>
			<button class="primary" @click="save()">Export</button>
		</footer>
	</div>
</GsModal>
</template>

<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue';
import { SettingsStore } from '@/settings';
import { version } from '@/version';
import { encode } from '@msgpack/msgpack';
import { useStore } from '@/store';
import { genId } from '@/utility/misc.ts';
import * as api from '@/api.js';
import GsModal from './common/GsModal.vue';

const store = useStore();

const modal = useTemplateRef('modal');

const emit = defineEmits<{
	(ev: 'closed'): void;
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
	ok();
}

function cancel() {
	ok();
}

function ok() {
	modal.value!.close();
}
</script>
