<template>
<div :class="$style.root">
	<div :class="$style.nodesContainer">
		<GsNodes :group="null"/>

		<GsButton :class="$style.addButton" full @click="showAddNodeMenu">Add node</GsButton>

		<!--<GsNodesX/>-->
		<GsWires/>
	</div>
</div>
</template>

<script lang="ts" setup>
import { onMounted, ref, shallowRef } from 'vue';
import GsNodes from './GsNodes.vue';
import GsNodesX from './GsNodesX.vue';
import GsWires from './GsWires.vue';
import GsButton from './common/GsButton.vue';
import { showAddNodeMenu } from '@/app.ts';
</script>

<style module lang="scss">
.root {
	height: 100%;
}

.nodesContainer {
	height: 100%;
	overflow: auto;
	background: var(--THEME-bg);
	padding: 8px;
	box-sizing: border-box;
}

.addButton {
	margin-top: 8px;
}
</style>
