<template>
<XDialog>
	<div class="dashboard-componet">
		<div class="section">
			<div><b>Glitch Studio</b></div>
			<div>{{ version }}</div>
		</div>
		<div>
			<GsButton inline @click="emit('newProject')">New project</GsButton>
		</div>
		<div>
			<GsButton inline @click="emit('newProjectFromImageOrVideo')">New project from image/video</GsButton>
		</div>
		<div>
			<GsButton inline @click="emit('openProject')">Open project</GsButton>
		</div>
	</div>
</XDialog>
</template>

<script lang="ts" setup>
import { version } from '@/version';
import XDialog from './dialog.vue';
import GsButton from './common/GsButton.vue';

const emit = defineEmits<{
	(ev: 'openProject'): void;
	(ev: 'newProject'): void;
	(ev: 'newProjectFromImageOrVideo'): void;
}>();
</script>

<style scoped lang="scss">
.dashboard-componet {
	> .section {
		margin: 0 0 16px 0;
	}
}
</style>
