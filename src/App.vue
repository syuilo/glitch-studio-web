<template>
<component
	:is="popup.component"
	v-for="popup in ui.popups.value"
	:key="popup.id"
	v-bind="popup.props"
	v-on="popup.events"
/>

<div :class="$style.root">
	<div :class="$style.header">
		<GsButton @click="saveProject">Save project</GsButton>
		<GsButton @click="openProject">Load project</GsButton>

		<GsButton @click="importPreset">Import Preset</GsButton>
		<GsButton @click="saveImage">save</GsButton>
		<!--<button @click="saveAnimationGif">save animation (GIF)</button>-->
		<GsButton @click="saveAnimation">save animation (連番)</GsButton>
		<GsButton @click="showAbout">about</GsButton>
	</div>
	<div :class="$style.body">
		<GsWorkspaceDivider style="flex: 1" :divider="store.workspaceDefinition" />
	</div>
	<div :class="$style.footer">
		<div>{{ store.renderWidth }} x {{ store.renderHeight }} px</div>
		<div :class="$style.footerStats">
			<div :class="$style.footerStatsItem">{{ (engine.gpuAverageDisplayFast.value / 1000).toFixed(1) }}ms</div>
			<div :class="$style.footerStatsItem">{{ (engine.gpuAverageDisplayMedium.value / 1000).toFixed(1) }}ms</div>
			<div :class="$style.footerStatsItem">{{ (engine.gpuAverageDisplaySlow.value / 1000).toFixed(1) }}ms</div>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { Ref, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue';
import GsAboutDialog from '@/components/GsAboutDialog.vue';
import GsDashboardDialog from '@/components/GsDashboardDialog.vue';
import XSavePreset from '@/components/save-preset.vue';
import XExportPreset from '@/components/export-preset.vue';
import GsWorkspaceDivider from '@/components/GsWorkspaceDivider.vue';
import XHistogram from '@/components/histogram.vue';
import { useStore } from '@/store';
import { i18n } from '@/i18n';
import { genId } from './utility/misc';
import { frame, frameMax, appReady, rendererEnv, saveProject, engine, openProject } from './app';
import * as api from '@/api.js';
import GsButton from '@/components/common/GsButton.vue';
import { loadProjectFile } from '@/api.js';
import { version } from './version';
import * as ui from '@/ui.js';

const store = useStore();

const progress = ref(0);
const presetName = '';
const showSavePresetDialog = ref(false);
const showExportPresetDialog = ref(false);

async function saveImage() {
	
}

async function saveAnimation() {
	const dirPath = await api.selectDirectory({
	});
	if (dirPath == null) return;

	frame.value = 0;

	for (let i = 0; i <= frameMax.value; i++) {
		console.log(`${i} of ${frameMax.value}`);
		const path = `${dirPath}/${i.toString().padStart(4, '0')}.png`;

		await new Promise(resolve => {
			canvas.value!.toBlob(async blob => {
				api.saveFile(path, await blob.arrayBuffer()).then(resolve);
			});
		});
	}
}

async function saveAnimationGif() {
	
}


async function importPreset() {
	const result = await api.openPresetFile({});
	if (result == null) return;

	const assets = await api.decodeAssets(result.preset.assets);

	for (const asset of assets) {
		store.addAsset(asset);
	}

	for (const node of result.preset.nodes) {
		store.nodes.push(node);
	}
}

function showAbout() {
	const { dispose } = ui.popup(GsAboutDialog, {}, {
		closed: () => dispose(),
	});
}

onMounted(() => {
	const { dispose } = ui.popup(GsDashboardDialog, {}, {
		closed: () => dispose(),
	});
});
</script>

<style module lang="scss">
.root {
	position: absolute;
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	height: 100%;
	width: 100%;
	overflow: clip;
}

.header {
	display: flex;
	height: 32px;
	line-height: 32px;
}

.body {
	display: flex;
	flex: 2;
	min-height: 0;
}

.footer {
	display: flex;
	height: 32px;
	box-sizing: border-box;
	line-height: 32px;
	font-size: 12px;
	padding: 0 12px;
}

.footerStats {
	margin-left: 16px;
	display: flex;
	gap: 8px;
}

.footerStatsItem {
	min-width: 4em;
}

body > .titlebar.inactive + div {
	background: #2c2c2c;
}

</style>
