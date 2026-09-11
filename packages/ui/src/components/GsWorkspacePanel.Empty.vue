<template>
<GsWorkspacePanel :panel="panel" :isStacked="isStacked">
	<template #header>
		Select panel
	</template>

	<div :class="$style.root">
		<GsButton v-for="choice in choices" :key="choice.type" small @click="panel.type = choice.type">{{ choice.label }}</GsButton>
	</div>
</GsWorkspacePanel>
</template>

<script lang="ts" setup>
import GsWorkspacePanel from './GsWorkspacePanel.vue';
import GsButton from './common/GsButton.vue';
import { workspacePanelChoices as choices, type WorkspacePanel } from '@/types/workspace.ts';

const props = defineProps<{
	panel: WorkspacePanel;
	isStacked?: boolean;
}>();
</script>

<style module lang="scss">
.root {
	display: flex;
	flex-wrap: wrap;
	align-content: flex-start;
	gap: 8px;
	padding: 12px;
	box-sizing: border-box;
	overflow: auto;
	height: 100%;
}
</style>
