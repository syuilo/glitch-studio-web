<template>
<div :class="[$style.root, { [$style.horizontal]: divider.direction === 'horizontal', [$style.vertical]: divider.direction === 'vertical' }]">
	<template v-for="child in divider.children" :key="child.id">
		<GsWorkspaceDivider v-if="child.type === null"
			:divider="child"
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
import { useStore } from '@/store.js';
import { genId } from '@/utils.js';
import { WorkspaceDivider } from '@/types/workspace.ts';
import XPreview from '@/components/GsWorkspacePanel.Preview.vue';

const panelComponents = {
	preview: XPreview,
};

const props = withDefaults(defineProps<{
	divider: WorkspaceDivider;
}>(), {
	
});

</script>

<style module lang="scss">
.root {
	display: flex;
}

.horizontal {
	flex-direction: row;
}

.vertical {
	flex-direction: column;
}

</style>
