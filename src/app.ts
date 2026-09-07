import { Ref, ref, markRaw, Component, reactive, watch } from 'vue';
import { useStore } from './store';
import { genId } from './utility/id.ts';
import { fxs } from './engine/fxs';
import { GsGroupNode } from './engine/renderer';
import { version } from '@/version';
import { loadProjectFile, saveProjectFile, decodeAssets } from './api';
import { RawProject } from './settings';
import { Engine } from './engine/engine.ts';
import * as ui from '@/ui.js';
import { deepClone } from './utility/deep-clone.ts';
import * as api from '@/api.js';

export const wireMap = reactive<{
	in: Record<string, any>;
	out: Record<string, HTMLElement>;
	allIn: Record<string, HTMLElement>;
}>({
	in: {},
	out: {},
	allIn: {},
});

export function showAddNodeMenu(ev: MouseEvent, group?: GsGroupNode) {
	const store = useStore();

	ui.popupMenu([{
		text: 'Group',
		action: () => {
			store.addGroupNode({
				id: genId()
			}, group);
		}
	}, ...Object.entries(fxs).filter(([_, v]) => v.category === '').map(x => ({
		text: x[1].displayName,
		action: () => {
			store.addFxNode({
				fx: x[1].name,
				id: genId()
			}, group);
		}
	})), {
		type: 'label',
		text: 'Glitch',
	}, ...Object.entries(fxs).filter(([_, v]) => v.category === 'glitch').map(x => ({
		text: x[1].displayName,
		action: () => {
			store.addFxNode({
				fx: x[1].name,
				id: genId()
			}, group);
		}
	})), {
		type: 'label',
		text: 'Effect',
	}, ...Object.entries(fxs).filter(([_, v]) => v.category === 'effect').map(x => ({
		text: x[1].displayName,
		action: () => {
			store.addFxNode({
				fx: x[1].name,
				id: genId()
			}, group);
		}
	})), {
		type: 'label',
		text: 'Draw',
	}, ...Object.entries(fxs).filter(([_, v]) => v.category === 'draw').map(x => ({
		text: x[1].displayName,
		action: () => {
			store.addFxNode({
				fx: x[1].name,
				id: genId()
			}, group);
		}
	})), {
		type: 'label',
		text: 'Color',
	}, ...Object.entries(fxs).filter(([_, v]) => v.category === 'color').map(x => ({
		text: x[1].displayName,
		action: () => {
			store.addFxNode({
				fx: x[1].name,
				id: genId()
			}, group);
		}
	})), {
		type: 'label',
		text: 'Utility',
	}, ...Object.entries(fxs).filter(([_, v]) => v.category === 'utility').map(x => ({
		text: x[1].displayName,
		action: () => {
			store.addFxNode({
				fx: x[1].name,
				id: genId()
			}, group);
		}
	}))], ev.currentTarget ?? ev.target);
}

function addFx(fx: string) {
	const store = useStore();
	if (fx == '') return;
	if (fx == '_group') {
		store.addGroupNode({
			id: genId()
		}, props.group);
	} else {
		store.addFxNode({
			fx: fx,
			id: genId()
		}, props.group);
	}
}

export const frameMax = ref(59);
export const frame = ref(0);
export const fpsLimit = ref(60);
export const resolutionFactor = ref(1);
export const playing = ref(false);

export const rendererEnv = {
	mouseX: 0,
	mouseY: 0,
};
export const engine = markRaw(new Engine());

watch(fpsLimit, () => {
	engine.fps = fpsLimit.value;
	engine.stopRenderLoop();
	engine.startRenderLoop();
});

let store: ReturnType<typeof useStore>;

export async function appReady(project: RawProject) {
	document.title = `Glitch Studio (${project.name})`;

	store = useStore();

	store.id = project.id;
	store.name = project.name;
	store.author = project.author;
	store.nodes = project.nodes;
	store.macros = project.macros;
	store.automations = project.automations;
	store.renderWidth = project.renderWidth;
	store.renderHeight = project.renderHeight;
	store.assets = await decodeAssets(project.assets);

	watch(() => store.nodes, () => {
		engine.updateNodes(deepClone(store.nodes));
	
		// TODO: グループ考慮
		if (store.nodes.some(n => n.type === 'fx' && n.fx === 'webcamera')) {
			glitchRenderer.setupWebcam();
		}
	}, { deep: true, immediate: true });
	
	watch(() => store.macros, () => {
		engine.updateMacros(deepClone(store.macros));
	}, { deep: true, immediate: true });
	
	watch(() => store.automations, () => {
		engine.updateAutomations(deepClone(store.automations));
	}, { deep: true, immediate: true });
	
	watch(() => store.assets, () => {
		engine.updateAssets(deepClone(store.assets));
	}, { deep: true, immediate: true });

	engine.startRenderLoop();
}

export function saveProject() {
	saveProjectFile({
		id: store.id,
		gsVersion: version,
		name: store.name,
		author: store.author,
		macros: store.macros,
		nodes: store.nodes,
		automations: store.automations,
		renderWidth: store.renderWidth,
		renderHeight: store.renderHeight,
		assets: store.assets.map(asset => ({
			id: asset.id,
			name: asset.name,
			width: asset.width,
			height: asset.height,
			fileDataType: asset.fileDataType,
			fileData: asset.fileData,
			hash: asset.hash,
		})),
	});
}

export async function openProject() {
	const { project, name } = await loadProjectFile();

	console.log('project', project);

	await appReady(project);
}

export async function newProject() {
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
}

export async function newProjectFromImageOrVideo() {
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
}