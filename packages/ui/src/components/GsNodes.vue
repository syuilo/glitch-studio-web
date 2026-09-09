<template>
<Sortable :modelValue="nodes" class="nodes _gaps_s" itemKey="id" tag="div" :group="{ name: 'nodes' }" handle=".drag-handle" :animation="150" :swapThreshold="0.5" @change="onChange">
	<template #item="{element}">
		<XGroupNode v-if="element.type === 'group'" :key="element.id" :node="element" :group="group"/>
		<XFxNode v-else :key="element.id" :node="element" :group="group"/>
	</template>
</Sortable>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue';
import XFxNode from './GsFxNode.vue';
import XGroupNode from './GsGroupNode.vue';
import { GsGroupNode, GsNode } from '@/engine/renderer.ts';
import { appContext } from '@/app.ts';

const Sortable = defineAsyncComponent(() => import('vuedraggable').then(x => x.default));

const props = defineProps<{
	group: GsGroupNode | null;
}>();

const nodes = computed(() => props.group ? props.group.nodes : appContext.state.nodes.value);

function onChange(event: {
	added?: { element: GsNode; newIndex: number };
	moved?: { element: GsNode; newIndex: number; oldIndex: number };
}) {
	// A cross-group drag also emits removed on the source; commit only at the destination.
	const change = event.added ?? event.moved;
	if (!change || (event.moved && event.moved.oldIndex === event.moved.newIndex)) return;
	appContext.commit('moveNode', {
		nodeId: change.element.id,
		groupId: props.group?.id ?? null,
		index: change.newIndex,
	});
}
</script>

<style scoped lang="scss">

</style>
