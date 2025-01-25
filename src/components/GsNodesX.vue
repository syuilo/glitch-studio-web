<template>
<div>
	<template v-for="element in nodes">
		<XGroupNode v-if="element.type === 'group'" :class="$style.node" :node="element" :group="group" :key="element.id" :style="{ top: element.x + 'px', left: element.y + 'px' }"/>
		<XFxNode v-else :class="$style.node" :node="element" :group="group" :key="element.id" :style="{ top: element.x + 'px', left: element.y + 'px' }"/>
	</template>
</div>
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

<style module lang="scss">
.node {
	position: absolute;
	z-index: 1;
}
</style>
