<template>
<div class="_gaps_s">
	<Sortable class="nodes _gaps_s" v-model="value" itemKey="id" tag="div" handle=".drag-handle" :animation="150" :swapThreshold="0.5">
		<template #item="{element}">
			<div style="display: flex;">
				<div class="port" :ref="el => portEls[element.id] = el">・</div>
				<GsSelect :modelValue="element.node" @update:modelValue="ev => value.find(x => x.id === element.id).node = ev" style="flex: 1;">
					<option :value="null">{{ i18n.ts.None }}</option>
					<optgroup label="In group" v-if="group && group.nodes.length > 0">
						<option v-for="node in group.nodes.filter(x => x.id !== props.node.id)" :value="node.id" :key="node.id">{{ node.type === 'fx' ? fxs[node.fx].displayName : node.name }} [{{ node.id }}]</option>
					</optgroup>
					<optgroup label="Nodes" v-if="store.nodes.length > 0">
						<option v-for="node in store.nodes.filter(x => x.id !== props.node.id)" :value="node.id" :key="node.id">{{ node.type === 'fx' ? fxs[node.fx].displayName : node.name }} [{{ node.id }}]</option>
					</optgroup>
				</GsSelect>
				<GsIconButton @click="remove(element)" style="margin-left: 4px;"><Fa :icon="faTimes"/></GsIconButton>
				<div class="drag-handle" style="margin-left: 4px;">
					<svg viewBox="0 0 16 16" version="1.1" class="grabber">
						<path fill="currentColor" d="M10 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm-4 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm5-9a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>
					</svg>
				</div>
			</div>
		</template>
	</Sortable>
	<GsButton @click="add">+</GsButton>
</div>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, ref, shallowRef, watch } from 'vue';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { fxs } from '@/engine/fxs';
import { i18n } from '@/i18n';
import { GsGroupNode, GsNode } from '@/engine/renderer';
import { ulid } from 'ulid';
import { useStore } from '@/store';
import GsButton from './GsButton.vue';
import GsIconButton from './GsIconButton.vue';
import GsSelect from './GsSelect.vue';
import { wireMap } from '@/app';

const Sortable = defineAsyncComponent(() => import('vuedraggable').then(x => x.default));

const store = useStore();

const props = defineProps<{
	modelValue: string[];
	node: GsNode;
	group?: GsGroupNode;
	name?: string;
}>();

const emit = defineEmits<{
	(ev: 'update:modelValue', value: string[]): void;
}>();

const portEls = ref<Record<string, HTMLElement>>({});

const value = ref(props.modelValue.map(x => ({
	id: ulid(),
	node: x,
})));

watch(portEls, () => {
	if (wireMap.in[props.node.id] == null) wireMap.in[props.node.id] = {};
	wireMap.in[props.node.id][props.name] = Object.values(portEls.value).map(x => {
		return x;
	});
}, { deep: true });

watch(value, () => {
	emit('update:modelValue', value.value.map(x => x.node));
}, { deep: true });

function add() {
	value.value.push({
		id: ulid(),
		node: null,
	});
}

function remove(element: { id: string; node: string; }) {
	value.value.splice(value.value.findIndex(x => x.id === element.id), 1);
}
</script>

<style scoped lang="scss">
.grabber {
	display: block;
	padding: 4px 0px;
	box-sizing: border-box;
	height: var(--control-height);
	cursor: move;
	user-select: none;
	opacity: 0.5;
}
</style>
