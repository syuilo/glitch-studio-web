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
import type { WorkspacePanel } from '@/types/workspace.ts';

const choices = [
	{ type: 'audioSpectrum', label: 'Audio Spectrum' },
	{ type: 'audioSpectrogram', label: 'Audio Spectrogram' },
	{ type: 'audioWaveform', label: 'Audio Waveform' },
	{ type: 'histogram', label: 'Histogram' },
	{ type: 'waveform', label: 'Waveform' },
	{ type: 'preview', label: 'Preview' },
	{ type: 'players', label: 'Players' },
	{ type: 'nodesEditor', label: 'Nodes' },
	{ type: 'macros', label: 'Macros' },
	{ type: 'stats', label: 'Stats' },
	{ type: 'commandLog', label: 'Command Log' },
];

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
