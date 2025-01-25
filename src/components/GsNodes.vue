<template>
<Sortable class="nodes _gaps_s" v-model="nodes" itemKey="id" tag="div" :group="{ name: 'nodes' }" handle=".drag-handle" :animation="150" :swapThreshold="0.5">
	<template #item="{element}">
		<XGroupNode v-if="element.type === 'group'" :node="element" :group="group" :key="element.id"/>
		<XFxNode v-else :node="element" :group="group" :key="element.id"/>
	</template>
</Sortable>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue';
import XFxNode from './fx-node.vue';
import XGroupNode from './group-node.vue';
import { fxs } from '@/engine/fxs';
import { useStore } from '@/store';
import { i18n } from '@/i18n';
import { GsGroupNode, GsNode } from '@/engine/renderer';
import { genId } from '@/utils';
import { popupMenu } from '@/app';

const Sortable = defineAsyncComponent(() => import('vuedraggable').then(x => x.default));

const store = useStore();

const props = defineProps<{
	group?: GsGroupNode;
}>();

const nodes = computed({
	get(): GsNode[] {
		return props.group ? props.group.nodes : store.nodes;
	},
	set(val): void {
		store.setNodes({ nodes: val }, props.group);
	}
});

const renderNodeId = computed({
	get() {
		return store.renderNodeId;
	},
	set(val) {
		store.renderNodeId = val;
	}
});
</script>

<style scoped lang="scss">

</style>
