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
import GsButton from './common/GsButton.vue';
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
	background: var(--THEME-bg);
	border-radius: 6px;
}

.nodes {
	position: relative;
	flex: 1;
	padding: 8px;
}
</style>
