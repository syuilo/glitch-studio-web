<template>
<XDialog>
	<div class="dashboard-componet">
		<div class="section">
			<div><b>Glitch Studio</b></div>
			<div>{{ version }}</div>
		</div>
		<GsButton inline @click="emit('new')">New project</GsButton>
		<GsButton inline @click="emit('open')">Open project file</GsButton>
	</div>
</XDialog>
</template>

<script lang="ts" setup>
import { version } from '@/version';
import XDialog from './dialog.vue';
import GsButton from './GsButton.vue';

const emit = defineEmits<{
	(ev: 'open'): void;
	(ev: 'new'): void;
}>();
</script>

<style scoped lang="scss">
.dashboard-componet {
	> .section {
		margin: 0 0 16px 0;
	}
}
</style>
