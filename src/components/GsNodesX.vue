<template>
<div>
	<template v-for="element in nodes">
		<XGroupNode v-if="element.type === 'group'" :key="element.id" :class="$style.node" :node="element" :group="group" :style="{ top: element.x + 'px', left: element.y + 'px' }"/>
		<XFxNode v-else :key="element.id" :class="$style.node" :node="element" :group="group" :style="{ top: element.x + 'px', left: element.y + 'px' }"/>
	</template>
</div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue';
import XFxNode from './GsFxNode.vue';
import XGroupNode from './GsGroupNode.vue';
import { fxs } from '@/engine/fxs';
import { i18n } from '@/i18n';
import { GsGroupNode, GsNode } from '@/engine/renderer.ts';

const props = defineProps<{
	group?: GsGroupNode;
}>();

const nodes = computed({
	get(): GsNode[] {
		return props.group ? props.group.nodes : store.nodes;
	},
	set(val): void {
		store.setNodes({ nodes: val }, props.group);
	},
});

const renderNodeId = computed({
	get() {
		return store.renderNodeId;
	},
	set(val) {
		store.renderNodeId = val;
	},
});
</script>

<style module lang="scss">
.node {
	position: absolute;
	z-index: 1;
}
</style>
