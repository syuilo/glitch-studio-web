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
		<GsButton @click="showAbout = true">about</GsButton>
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
	<XSavePreset v-if="showSavePresetDialog" @ok="showSavePresetDialog = false"/>
	<XExportPreset v-if="showExportPresetDialog" @ok="showExportPresetDialog = false"/>
	<XAbout v-if="showAbout" @ok="showAbout = false"/>
	<XDashboard v-if="showDashboard" @openProject="openProject" @newProject="newProject" @newProjectFromImageOrVideo="newProjectFromImageOrVideo"/>
</div>
</template>

<script lang="ts" setup>
import { Ref, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue';
import XAbout from '@/components/about.vue';
import XDashboard from '@/components/dashboard.vue';
import XSavePreset from '@/components/save-preset.vue';
import XExportPreset from '@/components/export-preset.vue';
import GsWorkspaceDivider from '@/components/GsWorkspaceDivider.vue';
import XHistogram from '@/components/histogram.vue';
import { useStore } from '@/store';
import { i18n } from '@/i18n';
import { genId } from './utils';
import { frame, frameMax, appReady, rendererEnv, saveProject, engine } from './app';
import * as api from '@/api.js';
import GsButton from '@/components/common/GsButton.vue';
import { loadProjectFile } from '@/api.js';
import { version } from './version';
import * as ui from '@/ui.js';

const store = useStore();

const progress = ref(0);
const presetName = '';
const showAbout = ref(false);
const showDashboard = ref(true);
const showSavePresetDialog = ref(false);
const showExportPresetDialog = ref(false);

async function openProject() {
	const { project, name } = await loadProjectFile();

	console.log('project', project);

	await appReady(project);

	showDashboard.value = false;
}

async function newProject() {
	await appReady({
		id: genId(),
		gsVersion: version,
		name: 'untitled',
		author: 'TODO',
		nodes: [],
		assets: [],
		macros: [],
		automations: [],
		renderWidth: 2048,
		renderHeight: 2048,
	});
	showDashboard.value = false;
}

async function newProjectFromImageOrVideo() {
	const result = await api.openImageOrVideoFile({});
	if (result == null) return;

	const assetId = genId();

	await appReady({
		id: genId(),
		gsVersion: version,
		name: result.name,
		author: 'TODO',
		nodes: [],
		assets: [],
		macros: [],
		automations: [],
		renderWidth: result.width,
		renderHeight: result.height,
	});

	store.addAsset({
		id: assetId,
		name: result.name,
		width: result.width,
		height: result.height,
		data: result.data,
		fileDataType: result.type,
		fileData: result.fileData,
		hash: result.hash,
	});

	if (result.type.startsWith('image/')) {
		store.addFxNode({
			fx: 'image',
			id: genId(),
			params: {
				image: { type: 'literal', value: assetId }
			}
		});
	} else if (result.type.startsWith('video/')) {
		store.addFxNode({
			fx: 'video',
			id: genId(),
			params: {
				video: { type: 'literal', value: assetId }
			}
		});
	}

	showDashboard.value = false;
}

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
