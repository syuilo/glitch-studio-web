<template>
<GsWorkspacePanel :panel="panel" :isStacked="isStacked">
	<template #header>
		<i class="ti ti-logs"></i><span style="margin-left: 8px;">Command Log</span>
	</template>

	<div :class="$style.root">
		<div v-for="value in appContext.undoStack.value">
			<div>{{ value.type }}</div>
		</div>
	</div>
</GsWorkspacePanel>
</template>

<script lang="ts" setup>
import { watch, useTemplateRef, ref, onMounted } from 'vue';
import GsWorkspacePanel from './GsWorkspacePanel.vue';
import { WorkspacePanel } from '@/types/workspace.ts';
import { i18n } from '@/i18n';
import { appContext } from '@/app.ts';

const props = defineProps<{
	panel: WorkspacePanel;
	isStacked?: boolean;
}>();
</script>

<style module lang="scss">
.root {
	height: 100%;
}
</style>
