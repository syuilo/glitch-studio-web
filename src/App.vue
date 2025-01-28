<template>
<main id="root">
	<component
		:is="popup.component"
		v-for="popup in popups"
		:key="popup.id"
		v-bind="popup.props"
		v-on="popup.events"
	/>
	<!--
	<div class="histogram" v-if="histogram && showHistogram">
		<XHistogram :histogram="histogram"/>
	</div>
-->
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
		<div class="main" @wheel="onViewWheel">
			<div class="_gs-container viewer" dropzone="copy" @dragover.prevent="e => { e.dataTransfer.dropEffect = 'copy'; }" @drop.prevent="onDrop">
				<div class="scaling">
					<div class="zoom">ZOOM: {{ Math.round(zoom * 100) }}%</div>
				</div>
				<div class="container" @click="onViewClick()" @mousemove="onMousemove">
					<canvas ref="canvas"/>
				</div>
			</div>
		</div>
		<div class="side">
			<div class="tab">
				<div :class="{ active: tab === 'nodes' }" @click="tab = 'nodes'">{{ i18n.ts.Fx }}<span>({{ store.nodes.length }})</span></div>
				<div :class="{ active: tab === 'macros' }" @click="tab = 'macros'">{{ i18n.ts.Macro }}<span>({{ store.macros.length }})</span></div>
				<div :class="{ active: tab === 'assets' }" @click="tab = 'assets'">{{ i18n.ts.Asset }}<span>({{ store.assets.length }})</span></div>
				<div :class="{ active: tab === 'project' }" @click="tab = 'project'">{{ i18n.ts.Project }}</div>
			</div>
			<GsNodesTab v-show="tab === 'nodes'" class="_gs-container"/>
			<XMacros v-show="tab === 'macros'"/>
			<XAssets v-show="tab === 'assets'"/>
		</div>
	</div>
	<div class="timeline">
		<GsTimeline/>
	</div>
	<footer class="footer">
		<div class="histogram">
			<template v-if="histogram">
				<div class="r"><div :style="{ height: ((histogram.rAmount / (255 * subStore.imageWidth * subStore.imageHeight)) * 100) + '%' }"></div></div>
				<div class="g"><div :style="{ height: ((histogram.gAmount / (255 * subStore.imageWidth * subStore.imageHeight)) * 100) + '%' }"></div></div>
				<div class="b"><div :style="{ height: ((histogram.bAmount / (255 * subStore.imageWidth * subStore.imageHeight)) * 100) + '%' }"></div></div>
			</template>
			<template v-else>
				<div class="r"><div></div></div>
				<div class="g"><div></div></div>
				<div class="b"><div></div></div>
			</template>
		</div>
		<div class="file">{{ store.renderWidth }} x {{ store.renderHeight }} px</div>
		<div class="progress">
			<div><div :style="{ width: progress + '%' }"></div></div>
		</div>
		<div class="status">{{ status }}</div>
	</footer>
	<XSavePreset v-if="showSavePresetDialog" @ok="showSavePresetDialog = false"/>
	<XExportPreset v-if="showExportPresetDialog" @ok="showExportPresetDialog = false"/>
	<XAbout v-if="showAbout" @ok="showAbout = false"/>
	<XDashboard v-if="showDashboard" @openProject="openProject" @newProject="newProject" @newProjectFromImage="newProjectFromImage"/>
</main>
</template>

<script lang="ts" setup>
import * as semver from 'semver';
import { Ref, nextTick, onMounted, ref, shallowRef, watch } from 'vue';
import GsNodesTab from '@/components/GsNodesTab.vue';
import XMacros from '@/components/macros.vue';
import XAssets from '@/components/assets.vue';
import XAbout from '@/components/about.vue';
import XDashboard from '@/components/dashboard.vue';
import GsTimeline from '@/components/GsTimeline.vue';
import XSavePreset from '@/components/save-preset.vue';
import XExportPreset from '@/components/export-preset.vue';
import XHistogram from '@/components/histogram.vue';
import { Histogram, initGl } from '@/glitch';
import { SettingsStore, Preset } from '@/settings';
import { subStore } from '@/sub-store';
import { Image } from '@/types';
import { useStore } from '@/store';
import { i18n } from '@/i18n';
import { genId } from './utils';
import * as msgpack from '@msgpack/msgpack';
import { frame, popups, playing, frameMax, fps, glitchRenderer, render, appReady, rendererEnv, saveProject } from './app';
import * as api from '@/api.js';
import GsButton from './components/GsButton.vue';
import { loadProjectFile } from '@/api.js';
import { version } from './version';

const store = useStore();

const canvas = shallowRef<HTMLCanvasElement>();
let img = null as Image | null;
let imgHash = null as string | null;
const histogram = null as Histogram | null;
const status = null as string | null;
const progress = ref(0);
const tab = ref('nodes');
const presetName = '';
const showAbout = ref(false);
const showDashboard = ref(true);
const showSavePresetDialog = false;
const showExportPresetDialog = false;
const ZOOM_STEP = 1.25;
const zoom = ref(1 / ZOOM_STEP / ZOOM_STEP / ZOOM_STEP);

async function onViewClick() {
	if (store.nodes.length === 0) {
		const result = await api.openImageFile({});
		if (result == null) return;

		const assetId = genId();
		store.addAsset({
			id: assetId,
			name: result.name,
			width: result.img.width,
			height: result.img.height,
			data: result.img.data,
			fileDataType: result.type,
			fileData: result.fileData,
			hash: result.hash,
		});
		store.addFxNode({
			fx: 'image',
			id: genId(),
			params: {
				image: { type: 'literal', value: assetId }
			}
		});
	}
}

async function openProject() {
	const { project, name } = await loadProjectFile();

	console.log('project', project);

	await appReady(canvas.value!, project);

	showDashboard.value = false;
}

async function newProject() {
	await appReady(canvas.value!, {
		id: genId(),
		gsVersion: version,
		name: 'untitled',
		author: 'TODO',
		nodes: [],
		assets: [],
		macros: [],
		automations: [],
		renderWidth: 4096,
		renderHeight: 4096,
	});
	showDashboard.value = false;
}

async function newProjectFromImage() {
	const result = await api.openImageFile({});
	if (result == null) return;

	const assetId = genId();

	await appReady(canvas.value!, {
		id: genId(),
		gsVersion: version,
		name: result.name,
		author: 'TODO',
		nodes: [],
		assets: [],
		macros: [],
		automations: [],
		renderWidth: result.img.width,
		renderHeight: result.img.height,
	});

	store.addAsset({
		id: assetId,
		name: result.name,
		width: result.img.width,
		height: result.img.height,
		data: result.img.data,
		fileDataType: result.type,
		fileData: result.fileData,
		hash: result.hash,
	});

	store.addFxNode({
		fx: 'image',
		id: genId(),
		params: {
			image: { type: 'literal', value: assetId }
		}
	});

	showDashboard.value = false;
}

async function saveImage() {
	const path = await api.showSaveDialog({
		filters: [{
			name: 'Image',
			extensions: ['png']
		}]
	});
	if (path == null) return;
	canvas.value!.toBlob(async blob => {
		api.saveFile(path, await blob.arrayBuffer());
	});
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

function onDrop(ev: DragEvent) {
	for (const file of ev.dataTransfer!.files) {
		openImageFromPath(file.path);
	}
}

function onMousemove(ev: MouseEvent) {
	const rect = canvas.value!.getBoundingClientRect();
	rendererEnv.mouseX = ((ev.clientX - rect.left) / rect.width) - 0.5;
	rendererEnv.mouseY = ((ev.clientY - rect.top) / rect.height) - 0.5;
}

function onViewWheel(ev: WheelEvent) {
	ev.preventDefault();
	if (ev.deltaY < 0) {
		zoom.value = Math.max(0, Math.min(100, zoom.value * ZOOM_STEP));
	} else {
		zoom.value = Math.max(0, Math.min(100, zoom.value / ZOOM_STEP));
	}
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
#root {
	position: absolute;
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	height: 100%;
	width: 100%;
	background: #181818;
	overflow: clip;

	> .histogram {
		position: fixed;
		bottom: 64px + 8px;
		left: 32px + 8px;
		padding: 16px;
		pointer-events: none;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(8px);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
		border-radius: 4px;
	}

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

		> .main {
			width: 65%;
			height: 100%;
			box-sizing: border-box;
			padding: 8px 0 8px 8px;

			> .viewer {
				position: relative;
				width: 100%;
				height: 100%;
				box-sizing: border-box;

				> .scaling {
					position: absolute;
					z-index: 1;
					top: 0;
					right: 0;
					padding: 4px 8px;
					background: #0008;
				}

				> .container {
					width: 100%;
					height: 100%;
					display: grid;
					place-content: center;
					$color1: #3a3a3a;
					$color2: #303030;
					background-color: $color1;
					background-image: linear-gradient(45deg, $color2 25%, transparent 25%, transparent 75%, $color2 75%, $color2), linear-gradient(-45deg, $color2 25%, transparent 25%, transparent 75%, $color2 75%, $color2);
					background-size: 32px 32px;
					animation: bg 0.7s linear infinite;
					overflow: clip;
					contain: content;

					> canvas {
						display: block;
						image-rendering: pixelated;
						scale: v-bind(zoom);
						//box-shadow: 0px 0px 0px 999px #0006;
					}
				}
			}
		}

		> .side {
			width: 35%;
			height: 100%;
			box-sizing: border-box;
			display: flex;
			flex-direction: column;
			padding: 8px;

			> .tab {
				> div {
					display: inline-block;
					border: solid 1px rgba(255, 255, 255, 0.1);
					border-bottom: solid 1px transparent;
					border-radius: 4px 4px 0 0;
					padding: 8px 12px;
					margin-bottom: -1px;
					z-index: 1;
					position: relative;
					font-size: 12px;
					cursor: pointer;
					color: rgba(255, 255, 255, 0.7);
					line-height: 16px;

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

		> .histogram {
			margin-right: 16px;
			padding: 4px 0 0 0;

			> div {
				display: inline-block;
				width: 4px;
				height: 16px;
				border-top: solid 1px transparent;
				border-bottom: solid 1px #383838;
				background: #111;
				box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.3) inset;
				position: relative;
				border-radius: 2px;
				overflow: hidden;

				&:not(:last-child) {
					margin-right: 8px;
				}

				> div {
					position: absolute;
					bottom: 0;
					width: 4px;
				}

				&.r > div {
					background: #f00;
				}

				&.g > div {
					background: #0f0;
				}

				&.b > div {
					background: #00f;
				}
			}
		}

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
	}
}

body > .titlebar.inactive + div {
	background: #2c2c2c;
}

@keyframes bg {
	0% {
		background-position: 0 0;
	}

	100% {
		background-position: -32px -32px;
	}
}
</style>
