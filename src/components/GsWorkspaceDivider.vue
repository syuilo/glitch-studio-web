<template>
<div :class="[$style.root, { [$style.horizontal]: divider.direction === 'horizontal', [$style.vertical]: divider.direction === 'vertical' }]">
	<template v-for="child in divider.children" :key="child.id">
		<GsWorkspaceDivider v-if="child.type === null"
			:divider="child"
			style="flex: 1"
		/>
		<component v-else
			:is="panelComponents[child.type]"
			:ref="child.id"
			:key="child.id"
			:panel="child"
			style="flex: 1"
		/>
	</template>
</div>
</template>

<script lang="ts" setup>
import {} from 'vue';
import { WorkspaceDivider } from '@/types/workspace.ts';
import XPreview from '@/components/GsWorkspacePanel.Preview.vue';
import XNodesEditor from '@/components/GsWorkspacePanel.NodesEditor.vue';
import XHistogram from '@/components/GsWorkspacePanel.Histogram.vue';
import XWaveform from '@/components/GsWorkspacePanel.Waveform.vue';
import XStats from '@/components/GsWorkspacePanel.Stats.vue';

const panelComponents = {
	preview: XPreview,
	nodesEditor: XNodesEditor,
	histogram: XHistogram,
	waveform: XWaveform,
	stats: XStats,
};

const props = withDefaults(defineProps<{
	divider: WorkspaceDivider;
}>(), {
	
});

</script>

<style module lang="scss">
.root {
	display: flex;
	gap: 5px;
}

.horizontal {
	flex-direction: row;
}

.vertical {
	flex-direction: column;
}

</style>
