<template>
<GsModal ref="modal" preferType="dialog" @closed="emit('closed')">
	<div :class="$style.root" class="_gaps_s">
		<div>
			<div><b>Glitch Studio</b></div>
			<div>{{ version }}</div>
		</div>
		<div>
			<GsButton inline @click="_newProject">New project</GsButton>
		</div>
		<div>
			<GsButton inline @click="_newProjectFromImageOrVideo">New project from image/video</GsButton>
		</div>
		<div>
			<GsButton inline @click="_openProject">Open project</GsButton>
		</div>
	</div>
</GsModal>
</template>

<script lang="ts" setup>
import { useTemplateRef } from 'vue';
import GsButton from './common/GsButton.vue';
import GsModal from './common/GsModal.vue';
import { version } from '@/version';
import { newProject, newProjectFromImageOrVideo, openProject } from '@/app.ts';

const modal = useTemplateRef('modal');

const emit = defineEmits<{
	(ev: 'closed'): void;
}>();

async function _newProject() {
	await newProject();
	modal.value!.close();
}

async function _newProjectFromImageOrVideo() {
	await newProjectFromImageOrVideo();
	modal.value!.close();
}

async function _openProject() {
	await openProject();
	modal.value!.close();
}
</script>

<style lang="scss" module>
.root {
	margin: auto;
	position: relative;
	padding: 32px;
	min-width: 320px;
	max-width: 480px;
	box-sizing: border-box;
	text-align: center;
	background: var(--THEME-dialog);
	border-radius: 10px;
}
</style>
