<template>
<GsWorkspacePanel :panel="panel" :isStacked="isStacked">
	<template #header><i class="ti ti-chart-area"></i><span style="margin-left: 8px;">Audio Spectrogram</span></template>
	<div :class="$style.root"><GsAudioSpectrogram :options="options"/></div>
</GsWorkspacePanel>
</template>

<script lang="ts" setup>
import GsWorkspacePanel from './GsWorkspacePanel.vue';
import GsAudioSpectrogram from './GsAudioSpectrogram.vue';
import type { AudioSpectrogramOptions } from '@glitch/shared/utility/audio-spectrogram.ts';
import type { WorkspacePanel } from '@/types/workspace.ts';
defineProps<{ panel: WorkspacePanel; isStacked?: boolean; options?: Partial<AudioSpectrogramOptions> }>();
</script>

<style module lang="scss">
.root { height: 100%; padding: 2px 12px 12px; box-sizing: border-box; }
</style>
