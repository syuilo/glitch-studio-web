<template>
<div :class="$style.root">
	<div :class="$style.main">
		<GsButton full @click="showAddNodeMenu">Add node</GsButton>
		<div :class="$style.nodesContainer">
			<div :class="$style.nodes">
				<GsNodes/>
				<!--<GsNodesX/>-->
				<GsWires/>
			</div>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { onMounted, ref, shallowRef } from 'vue';
import GsNodes from './GsNodes.vue';
import GsNodesX from './GsNodesX.vue';
import GsWires from './GsWires.vue';
import GsButton from './GsButton.vue';
import { showAddNodeMenu } from '@/app';
</script>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.main {
	box-sizing: border-box;
	height: 100%;
	padding: 8px;
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
}

.nodesContainer {
	height: 100%;
	overflow: auto;
	border: solid 1px rgba(255, 255, 255, 0.1);
	background: rgba(0, 0, 0, 0.3);
	box-shadow: 0 2px 2px rgba(0, 0, 0, 0.7) inset;
	border-radius: 6px;
}

.nodes {
	position: relative;
	flex: 1;
	padding: 8px;
}
</style>
