<template>
<GsWorkspacePanel :panel="panel" :isStacked="isStacked">
	<template #header>
		<i class="ti ti-chart-column"></i><span style="margin-left: 8px;">Waveform</span>
	</template>

	<div :class="$style.root">
		<GsWaveform/>
	</div>
</GsWorkspacePanel>
</template>

<script lang="ts" setup>
import { watch, useTemplateRef, ref, onMounted } from 'vue';
import GsWorkspacePanel from './GsWorkspacePanel.vue';
import type { WorkspacePanel } from '@/types/workspace.ts';
import { i18n } from '@/i18n.ts';
import GsWaveform from '@/components/GsWaveform.vue';

const props = defineProps<{
	panel: WorkspacePanel;
	isStacked?: boolean;
}>();
</script>

<style module lang="scss">
.root {
	height: 100%;
	padding: 2px 12px 12px 12px;
	box-sizing: border-box;
}
</style>
