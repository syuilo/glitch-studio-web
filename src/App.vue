<template>
<component
	:is="popup.component"
	v-for="popup in ui.popups.value"
	:key="popup.id"
	v-bind="popup.props"
	v-on="popup.events"
/>

<main id="main">
	<header class="header">
		<GsButton @click="saveProject">Save project</GsButton>
		<GsButton @click="openProject">Load project</GsButton>

		<GsButton @click="importPreset">Import Preset</GsButton>
		<GsButton @click="saveImage">save</GsButton>
		<!--<button @click="saveAnimationGif">save animation (GIF)</button>-->
		<GsButton @click="saveAnimation">save animation (連番)</GsButton>
		<GsButton @click="showAbout = true">about</GsButton>
	</header>
	<div class="a">
		<GsWorkspaceDivider style="flex: 1" :divider="{ children: [{ id: 'a', type: 'preview' }] }" />
		<div class="side">
			<div class="tab">
				<button type="button" :class="{ active: tab === 'nodes' }" :aria-pressed="tab === 'nodes'" @click="tab = 'nodes'">{{ i18n.ts.Fx }}<span>({{ store.nodes.length }})</span></button>
				<button type="button" :class="{ active: tab === 'macros' }" :aria-pressed="tab === 'macros'" @click="tab = 'macros'">{{ i18n.ts.Macro }}<span>({{ store.macros.length }})</span></button>
				<button type="button" :class="{ active: tab === 'assets' }" :aria-pressed="tab === 'assets'" @click="tab = 'assets'">{{ i18n.ts.Asset }}<span>({{ store.assets.length }})</span></button>
				<button type="button" :class="{ active: tab === 'project' }" :aria-pressed="tab === 'project'" @click="tab = 'project'">{{ i18n.ts.Project }}</button>
				<button type="button" :class="{ active: tab === 'stats' }" :aria-pressed="tab === 'stats'" @click="tab = 'stats'">{{ i18n.ts.Stats }}</button>
				<button type="button" :class="{ active: tab === 'monitors' }" :aria-pressed="tab === 'monitors'" @click="tab = 'monitors'">{{ i18n.ts.Monitors }}</button>
				<button type="button" :class="{ active: tab === 'settings' }" :aria-pressed="tab === 'settings'" @click="tab = 'settings'">{{ i18n.ts.Settings }}</button>
			</div>
			<GsNodesTab v-show="tab === 'nodes'" class="_gs-container"/>
			<XMacros v-show="tab === 'macros'"/>
			<XAssets v-show="tab === 'assets'"/>
			<XStats v-show="tab === 'stats'" :engine="engine"/>
			<XWaveform v-if="tab === 'monitors'" :engine="engine"/>
			<XSettings v-show="tab === 'settings'"/> 
		</div>
	</div>
	<div class="timeline">
		<GsTimeline/>
	</div>
	<footer class="footer">
		<div class="file">{{ store.renderWidth }} x {{ store.renderHeight }} px</div>
		<div class="progress">
			<div><div :style="{ width: progress + '%' }"></div></div>
		</div>
		<div class="status">{{ status }}</div>
		<div class="stats">
			<div>{{ (engine.gpuAverageDisplayFast.value / 1000).toFixed(1) }}ms</div>
			<div>{{ (engine.gpuAverageDisplayMedium.value / 1000).toFixed(1) }}ms</div>
			<div>{{ (engine.gpuAverageDisplaySlow.value / 1000).toFixed(1) }}ms</div>
		</div>
	</footer>
	<XSavePreset v-if="showSavePresetDialog" @ok="showSavePresetDialog = false"/>
	<XExportPreset v-if="showExportPresetDialog" @ok="showExportPresetDialog = false"/>
	<XAbout v-if="showAbout" @ok="showAbout = false"/>
	<XDashboard v-if="showDashboard" @openProject="openProject" @newProject="newProject" @newProjectFromImageOrVideo="newProjectFromImageOrVideo"/>
</main>
</template>

<script lang="ts" setup>
import { Ref, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue';
import GsNodesTab from '@/components/GsNodesTab.vue';
import XMacros from '@/components/macros.vue';
import XAssets from '@/components/assets.vue';
import XStats from '@/components/stats.vue';
import XSettings from '@/components/settings.vue';
import XAbout from '@/components/about.vue';
import XDashboard from '@/components/dashboard.vue';
import GsTimeline from '@/components/GsTimeline.vue';
import XSavePreset from '@/components/save-preset.vue';
import XExportPreset from '@/components/export-preset.vue';
import GsWorkspaceDivider from '@/components/GsWorkspaceDivider.vue';
import XHistogram from '@/components/histogram.vue';
import XWaveform from '@/components/waveform.vue';
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

const status = null as string | null;
const progress = ref(0);
const tab = ref('nodes');
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

<style lang="scss">
#main {
	position: absolute;
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	height: 100%;
	width: 100%;
	background: #181818;
	overflow: clip;

	> .header {
		display: flex;
		height: 32px;
		line-height: 32px;
	}

	> .a {
		display: flex;
		flex: 2;
		min-height: 0;
		box-shadow: 0 2px 2px -1px rgba(0, 0, 0, 0.7) inset;

		> .side {
			width: 35%;
			height: 100%;
			box-sizing: border-box;
			display: flex;
			flex-direction: column;
			padding: 8px;

			> .tab {
				display: flex;

				> button {
					appearance: none;
					display: block;
					flex: 0 1 auto;
					min-width: 0;
					border: solid 1px rgba(255, 255, 255, 0.1);
					border-bottom: solid 1px transparent;
					border-radius: 4px 4px 0 0;
					padding: 8px 4px;
					margin-bottom: -1px;
					z-index: 1;
					position: relative;
					font-size: 12px;
					font-family: inherit;
					cursor: pointer;
					color: rgba(255, 255, 255, 0.7);
					background: transparent;
					line-height: 16px;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;

					&:hover {
						color: #fff;
					}

					&.active {
						background: #202020;
						border-bottom: solid 1px #202020;
						cursor: default;
						font-weight: bold;
						color: #fff;
					}

					&:focus-visible {
						outline: solid 1px var(--accent);
						outline-offset: -3px;
					}

					> *:first-child {
						margin-right: 6px;
					}

					> span {
						margin-left: 6px;
						opacity: 0.7;
						font-size: 80%;
					}
				}
			}

			> .tab + * {
				border-top-left-radius: 0;
			}

			> .tab + * + * {
				border-top-left-radius: 0;
			}
		}
	}
	
	> .timeline {
		flex: 1;
	}

	> .footer {
		display: flex;
		height: 32px;
		box-sizing: border-box;
		background: linear-gradient(0deg, rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.025));
		border-top: solid 1px rgba(255, 255, 255, 0.1);
		line-height: 32px;
		font-size: 12px;
		padding: 0 12px;

		> .file {
			opacity: 0.8;
			flex-shrink: 0;
		}

		> .progress {
			margin-left: 16px;
			padding: 13px 0 0 0;

			> div {
				width: 150px;
				height: 4px;
				border-top: solid 1px transparent;
				border-bottom: solid 1px #383838;
				background: #111;
				box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.3) inset;
				position: relative;
				border-radius: 2px;
				overflow: hidden;

				> div {
					position: absolute;
					height: 8px;
					background: var(--accent);
				}
			}
		}

		> .status {
			margin-left: 16px;
		}

		> .stats {
			margin-left: 16px;
			display: flex;
			gap: 8px;

			> div {
				min-width: 4em;
			}
		}
	}
}

body > .titlebar.inactive + div {
	background: #2c2c2c;
}

</style>
