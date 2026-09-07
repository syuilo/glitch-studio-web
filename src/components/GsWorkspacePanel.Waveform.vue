<template>
<GsWorkspacePanel :panel="panel" :isStacked="isStacked">
	<template #header>
		<i class="ti ti-chart-column"></i><span style="margin-left: 8px;">Waveform</span>
	</template>

	<div :class="$style.root">
		<XWaveform />
	</div>
</GsWorkspacePanel>
</template>

<script lang="ts" setup>
import { watch, useTemplateRef, ref, onMounted } from 'vue';
import GsWorkspacePanel from './GsWorkspacePanel.vue';
import { WorkspacePanel } from '@/types/workspace.ts';
import { i18n } from '@/i18n';
import XWaveform from '@/components/waveform.vue';

const props = defineProps<{
	panel: WorkspacePanel;
	isStacked: boolean;
}>();
</script>

<style module lang="scss">
.root {
	height: 100%;
}
</style>
