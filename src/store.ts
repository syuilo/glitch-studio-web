import { ref } from 'vue';
import { defineStore } from 'pinia'
import { PiniaUndo } from 'pinia-undo'
import { fxs } from '@/engine/fxs';
import { genEmptyValue } from '@/utils';
import { Preset } from './settings';
import { Macro, Asset, FxParamDefs } from '@/types';
import { GsFxNode, GsGroupNode, GsNode } from '@/engine/renderer';
import { GpuFx, GsAutomation } from './engine/types';
import * as api from '@/api.js';

export const useStore = defineStore('main', () => {
	const macros = ref<Macro[]>([]);
	const automations = ref<GsAutomation[]>([]);
	const nodes = ref<GsNode[]>([]);
	const assets = ref<Asset[]>([]);
	const renderNodeId = ref<string | null>(null);
	const renderWidth = ref<number>(2048);
	const renderHeight = ref<number>(2048);

	function findNode(nodeId: string): GsNode | undefined {
		const search = (nodes: GsNode[]) => {
			for (const node of nodes) {
				if (node.id === nodeId) {
					return node;
				}
				if (node.type === 'group') {
					const found = search(node.nodes);
					if (found) {
						return found;
					}
				}
			}
		};
		return search(nodes.value);
	}

	function addFxNode(payload, group?: GsGroupNode) {
		const paramDefs = fxs[payload.fx].paramDefs as FxParamDefs;
		
		const params = {} as GsFxNode['params'];

		for (const [k, v] of Object.entries(paramDefs)) {
			if (v.type === 'seed') {
				params[k] = { type: 'literal', value: Math.floor(Math.random() * 16384) };
			} else if (v.type === 'time') {
				params[k] = { type: 'expression', value: 'TIME' };
			} else if (v.type === 'node' && v.primary && (group ? group.nodes : nodes.value).length > 0) {
				params[k] = { type: 'literal', value: (group ? group.nodes : nodes.value).at(-1).id };
			} else {
				params[k] = v.default!;
			}
		}

		if (group) {
			group.nodes.push({
				id: payload.id,
				isEnabled: true,
				type: 'fx',
				fx: payload.fx,
				params: {
					...params,
					...(payload.params ?? {}),
				},
				x: -1000 + (Math.random() * 2000),
				y: -1000 + (Math.random() * 2000),
			});
		} else {
			nodes.value.push({
				id: payload.id,
				isEnabled: true,
				type: 'fx',
				fx: payload.fx,
				params: {
					...params,
					...(payload.params ?? {}),
				},
				x: -1000 + (Math.random() * 2000),
				y: -1000 + (Math.random() * 2000),
			});
		}
	}

	function addGroupNode(payload, group?: GsGroupNode) {
		if (group) {
			group.nodes.push({
				id: payload.id,
				isEnabled: true,
				type: 'group',
				nodes: [],
				macros: [],
			});
		} else {
			nodes.value.push({
				id: payload.id,
				isEnabled: true,
				type: 'group',
				nodes: [],
				macros: [],
			});
		}
	}

	function removeNode(payload) {
		const treat = (src: GsNode) => {
			if (src.type === 'group') {
				for (const node of src.nodes) {
					if (node.id === payload.nodeId) {
						src.nodes = src.nodes.filter(node => node.id !== payload.nodeId);
						return true;
					}
					if (treat(node)) return true;
				}
			}
		};
		if (nodes.value.some(node => node.id === payload.nodeId)) {
			nodes.value = nodes.value.filter(node => node.id !== payload.nodeId);
		} else {
			for (const node of nodes.value) {
				treat(node);
			}
		}
	}

	function toggleEnable(payload) {
		const node = findNode(payload.nodeId)!;
		node.isEnabled = !node.isEnabled;
	}

	function setNodes(payload, group?: GroupNode) {
		if (group) {
			group.nodes = payload.nodes;
		} else {
			nodes.value = payload.nodes;
		}
	}

	function addMacro(payload) {
		(payload.group ? payload.group.macros : macros.value).push({
			id: payload.id,
			type: 'number',
			typeOptions: {},
			label: 'Macro',
			name: 'macro',
			value: {
				type: 'literal',
				value: 0
			}
		});
	}

	function changeParamValueType(payload) {
		const node = findNode(payload.nodeId)!;
		if (payload.type === 'expression') {
			node.params[payload.param] = {
				type: 'expression',
				value: ''
			};
		} else if (payload.type === 'literal') {
			node.params[payload.param] = {
				type: 'literal',
				value: genEmptyValue(fxs[node.fx].paramDefs[payload.param])
			};
		} else if (payload.type === 'automation') {
			node.params[payload.param] = {
				type: 'automation',
				value: null
			};
		}
	}

	function updateParamAsLiteral(payload) {
		const node = findNode(payload.nodeId)!;
		node.params[payload.param] = {
			type: 'literal',
			value: payload.value
		};
	}

	function updateParamAsExpression(payload) {
		const node = findNode(payload.nodeId)!;
		node.params[payload.param] = {
			type: 'expression',
			value: payload.value
		};
	}

	function updateParamAsAutomation(payload) {
		const node = findNode(payload.nodeId)!;
		node.params[payload.param] = {
			type: 'automation',
			value: payload.value
		};
	}

	function updateParams(payload) {
		const node = findNode(payload.nodeId)!;
		node.params = payload.params;
	}

	function updateGroupName(payload) {
		const node = findNode(payload.nodeId)!;
		node.name = payload.name;
	}

	function toggleMacroValueType(payload) {
		const macro = (payload.group ? payload.group.macros : macros.value).find(macro => macro.id === payload.macroId)!;
		const isLiteral = macro.value.type === 'literal';
		if (isLiteral) {
			macro.value = {
				type: 'expression',
				value: ''
			};
		} else {
			macro.value = {
				type: 'literal',
				value: genEmptyValue(macro)
			};
		}
	}

	function updateMacroAsLiteral(payload) {
		const macro = (payload.group ? payload.group.macros : macros.value).find(macro => macro.id === payload.macroId)!;
		macro.value = {
			type: 'literal',
			value: payload.value
		};
	}

	function updateMacroAsExpression(payload) {
		const macro = (payload.group ? payload.group.macros : macros.value).find(macro => macro.id === payload.macroId)!;
		macro.value = {
			type: 'expression',
			value: payload.value
		};
	}

	function updateMacroLabel(payload) {
		const macro = (payload.group ? payload.group.macros : macros.value).find(macro => macro.id === payload.macroId)!;
		macro.label = payload.value;
	}

	function updateMacroName(payload) {
		const macro = (payload.group ? payload.group.macros : macros.value).find(macro => macro.id === payload.macroId)!;
		macro.name = payload.value;
	}

	function updateMacroType(payload) {
		const macro = (payload.group ? payload.group.macros : macros.value).find(macro => macro.id === payload.macroId)!;
		macro.type = payload.value;
		macro.value = {
			type: 'literal',
			value: genEmptyValue(macro)
		};
	}

	function updateMacroTypeOption(payload) {
		const macro = (payload.group ? payload.group.macros : macros.value).find(macro => macro.id === payload.macroId)!;
		macro.typeOptions[payload.key] = payload.value;
	}

	function removeMacro(payload) {
		if (payload.group) {
			payload.group.macros = payload.group.macros.filter(macro => macro.id !== payload.macroId);
		} else {
			macros.value = macros.value.filter(macro => macro.id !== payload.macroId);
		}
	}

	//async function applyPreset(payload: Preset) {
	//	const assets = await api.decodeAssets(payload.assets ?? []);
//
	//	nodes.value = payload.nodes;
	//	macros.value = payload.macros;
	//	assets.value = assets;
	//}

	function addAsset(payload) {
		assets.value.push({
			id: payload.id,
			name: payload.name,
			width: payload.width,
			height: payload.height,
			data: payload.data,
			fileDataType: payload.fileDataType,
			fileData: payload.fileData,
			hash: payload.hash,
		});
	}

	function renameAsset(payload) {
		const asset = assets.value.find(asset => asset.id === payload.assetId)!;
		asset.name = payload.name;
	}

	function replaceAsset(payload) {
		const asset = assets.value.find(asset => asset.id === payload.assetId)!;
		asset.width = payload.width;
		asset.height = payload.height;
		asset.data = payload.data;
		asset.fileDataType = payload.fileDataType;
		asset.fileData = payload.fileData;
		asset.hash = payload.hash;
	}

	function removeAsset(payload) {
		assets.value = assets.value.filter(asset => asset.id !== payload.assetId);

		// そのAssetを参照しているパラメータをnullにする
		for (const node of nodes.value) {
			const imageParams = Object.entries(fxs[node.fx].paramDefs).filter(([k, v]) => v.type === 'image').map(([k, v]) => k);
			for (const p of imageParams) {
				if (node.params[p].type === 'literal' && node.params[p].value === payload.assetId) {
					node.params[p].value = null;
				}
			}
		}

		// そのAssetを参照しているマクロをnullにする
		for (const macro of macros.value.filter(m => m.type === 'image' && m.value.type === 'literal')) {
			macro.value = null;
		}
	}

	return {
		nodes,
		macros,
		automations,
		assets,
		renderNodeId,
		renderWidth,
		renderHeight,
		addFxNode,
		addGroupNode,
		removeNode,
		toggleEnable,
		setNodes,
		addMacro,
		changeParamValueType,
		updateParamAsLiteral,
		updateParamAsExpression,
		updateParamAsAutomation,
		updateParams,
		toggleMacroValueType,
		updateMacroAsLiteral,
		updateMacroAsExpression,
		updateMacroLabel,
		updateMacroName,
		updateMacroType,
		updateMacroTypeOption,
		removeMacro,
		//applyPreset,
		addAsset,
		renameAsset,
		replaceAsset,
		removeAsset,
		updateGroupName,
	};
});
