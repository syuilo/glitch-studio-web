<template>
<Sortable v-model="nodes" class="nodes _gaps_s" itemKey="id" tag="div" :group="{ name: 'nodes' }" handle=".drag-handle" :animation="150" :swapThreshold="0.5">
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
import { i18n } from '@/i18n';
import { GsGroupNode, GsNode } from '@/engine/renderer.ts';
import { appContext } from '@/app.ts';

const Sortable = defineAsyncComponent(() => import('vuedraggable').then(x => x.default));

const props = defineProps<{
	group?: GsGroupNode;
}>();

const nodes = computed({
	get(): GsNode[] {
		return props.group ? props.group.nodes : appContext.state.nodes.value;
	},
	set(val): void {
		//store.setNodes({ nodes: val }, props.group);
	},
});
</script>

<style scoped lang="scss">

</style>
