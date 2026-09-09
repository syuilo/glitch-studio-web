import { AiSON } from '@syuilo/aiscript';
import { deepClone } from '@glitch/shared/utility/deep-clone.ts';
import { genEmptyValue } from '@glitch/shared/utility/misc.ts';
import type { AppState } from './types.ts';
import type { Asset, FxParamDataType, FxParamDefs, GsFxNode, GsGroupNode, GsNode } from '@glitch/shared/types.ts';

export type CommandDef<Payload> = {
	label: string;
	create: (payload: Payload) => {
		execute(state: AppState): void;
		undo(state: AppState): void;
	};
};

function defineCommand<Payload>(def: CommandDef<Payload>) {
	return def;
}

const stateUtility = {
	findNode: (state: AppState, nodeId: string): GsNode | undefined => {
		const search = (nodes: GsNode[]): GsNode | undefined => {
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
		return search(state.nodes.value);
	},
};

const updateGroupNameCommandDef = defineCommand<{ nodeId: GsGroupNode['id']; name: string }>({
	label: 'Rename group',
	create: (payload) => {
		let before: string;
		return {
			execute(state) {
				const group = stateUtility.findNode(state, payload.nodeId) as GsGroupNode;
				before = group.name;
				group.name = payload.name;
			},
			undo(state) {
				const group = stateUtility.findNode(state, payload.nodeId) as GsGroupNode;
				group.name = before;
			},
		};
	},
});

const addFxNodeCommandDef = defineCommand<{ id: string; fx: string; params?: Record<string, any>; groupId?: string }>({
	label: 'Add fx node',
	create: (payload) => {
		return {
			execute(state) {
				const paramDefs = fxs[payload.fx].paramDefs as FxParamDefs;
				const group = payload.groupId ? state.nodes.value.find(node => node.type === 'group' && node.id === payload.groupId) as GsGroupNode : undefined;

				const params = {} as GsFxNode['params'];
				const defaultParams = deepClone(fxs[payload.fx].getDefaultParams());

				for (const [k, v] of Object.entries(paramDefs)) {
					if (defaultParams[k] != null) {
						params[k] = defaultParams[k];
					} else if (v.type === 'seed') {
						params[k] = { type: 'literal', value: Math.floor(Math.random() * 16384) };
					} else if (v.type === 'time') {
						params[k] = { type: 'expression', value: 'TIME' };
					} else if (v.type === 'node' && v.primary) {
						if ((group ? group.nodes : state.nodes.value).length > 0) {
							params[k] = { type: 'literal', value: (group ? group.nodes : state.nodes.value).at(-1)!.id };
						} else {
							params[k] = { type: 'literal', value: null };
						}
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
							...deepClone(payload.params ?? {}),
						},
						pos: { x: 0, y: 0 },
					});
				} else {
					state.nodes.value.push({
						id: payload.id,
						isEnabled: true,
						type: 'fx',
						fx: payload.fx,
						params: {
							...params,
							...deepClone(payload.params ?? {}),
						},
						pos: { x: 0, y: 0 },
					});
				}
			},

			undo(state) {
				const group = payload.groupId ? state.nodes.value.find(node => node.type === 'group' && node.id === payload.groupId) as GsGroupNode : undefined;
				if (group) {
					group.nodes = group.nodes.filter(node => node.id !== payload.id);
				} else {
					state.nodes.value = state.nodes.value.filter(node => node.id !== payload.id);
				}
			},
		};
	},
});

const moveNodeCommandDef = defineCommand<{ nodeId: string; groupId: string | null; index: number }>({
	label: 'Move node',
	create: (payload) => {
		let before: { groupId: string | null; index: number };
		const getNodes = (state: AppState, groupId: string | null): GsNode[] => {
			if (groupId === null) return state.nodes.value;
			const group = stateUtility.findNode(state, groupId);
			if (group?.type !== 'group') throw new Error('Group not found');
			return group.nodes;
		};
		const findLocation = (nodes: GsNode[], groupId: string | null = null): typeof before | undefined => {
			for (const [index, node] of nodes.entries()) {
				if (node.id === payload.nodeId) return { groupId, index };
				if (node.type === 'group') {
					const found = findLocation(node.nodes, node.id);
					if (found) return found;
				}
			}
		};
		return {
			execute(state) {
				const location = findLocation(state.nodes.value);
				if (!location) throw new Error('Node not found');
				before = location;
				const source = getNodes(state, before.groupId);
				const destination = getNodes(state, payload.groupId);
				const [node] = source.splice(before.index, 1);
				destination.splice(payload.index, 0, node);
			},
			undo(state) {
				const source = getNodes(state, payload.groupId);
				const destination = getNodes(state, before.groupId);
				const index = source.findIndex(node => node.id === payload.nodeId);
				if (index === -1) throw new Error('Node not found');
				const [node] = source.splice(index, 1);
				destination.splice(before.index, 0, node);
			},
		};
	},
});

const removeNodeCommandDef = defineCommand<{ nodeId: string }>({
	label: 'Remove node',
	create: (payload) => {
		return {
			execute(state) {
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
				if (state.nodes.value.some(node => node.id === payload.nodeId)) {
					state.nodes.value = state.nodes.value.filter(node => node.id !== payload.nodeId);
				} else {
					for (const node of state.nodes.value) {
						treat(node);
					}
				}
			},
			undo(state) {
				// TODO
			},
		};
	},
});

const addGroupNodeCommandDef = defineCommand<{ id: string; groupId?: GsGroupNode['id'] }>({
	label: 'Add group node',
	create: (payload) => {
		return {
			execute(state) {
				if (payload.groupId) {
					const group = state.nodes.value.find(node => node.id === payload.groupId) as GsGroupNode;
					group.nodes.push({
						id: payload.id,
						isEnabled: true,
						type: 'group',
						nodes: [],
						macros: [],
						name: '',
						pos: { x: 0, y: 0 },
					});
				} else {
					state.nodes.value.push({
						id: payload.id,
						isEnabled: true,
						type: 'group',
						nodes: [],
						macros: [],
						name: '',
						pos: { x: 0, y: 0 },
					});
				}
			},
			undo(state) {
				state.nodes.value = state.nodes.value.filter(node => node.id !== payload.id);
			},
		};
	},
});

const addAssetCommandDef = defineCommand<Asset>({
	label: 'Add asset',
	create: (payload) => {
		return {
			execute(state) {
				state.assets.value.push({
					id: payload.id,
					name: payload.name,
					width: payload.width,
					height: payload.height,
					data: deepClone(payload.data),
					fileDataType: payload.fileDataType,
					fileData: payload.fileData, // blobはimmutableなので多分deepCloneの必要なし
					hash: payload.hash,
				});
			},
			undo(state) {
				state.assets.value = state.assets.value.filter(asset => asset.id !== payload.id);
			},
		};
	},
});

const removeAssetCommandDef = defineCommand<{ assetId: string }>({
	label: 'Remove asset',
	create: (payload) => {
		return {
			execute(state) {
				state.assets.value = state.assets.value.filter(asset => asset.id !== payload.assetId);

				// そのAssetを参照しているパラメータをnullにする
				for (const node of state.nodes.value) {
					if (node.type === 'fx') {
						const imageParams = Object.entries(fxs[node.fx].paramDefs).filter(([k, v]) => v.type === 'image').map(([k, v]) => k);
						for (const p of imageParams) {
							if (node.params[p].type === 'literal' && node.params[p].value === payload.assetId) {
								node.params[p].value = null;
							}
						}
					}
				}

				// そのAssetを参照しているマクロをnullにする
				for (const macro of state.macros.value.filter(m => m.type === 'image' && m.value.type === 'literal')) {
					macro.value.value = null;
				}
			},
			undo(state) {
				// TODO
			},
		};
	},
});

const renameAssetCommandDef = defineCommand<{ assetId: string; name: string }>({
	label: 'Rename asset',
	create: (payload) => {
		return {
			execute(state) {
				const asset = state.assets.value.find(asset => asset.id === payload.assetId)!;
				asset.name = payload.name;
			},
			undo(state) {
				// TODO
			},
		};
	},
});

const replaceAssetCommandDef = defineCommand<Asset & { assetId: string }>({
	label: 'Replace asset',
	create: (payload) => {
		return {
			execute(state) {
				const asset = state.assets.value.find(asset => asset.id === payload.assetId)!;
				asset.width = payload.width;
				asset.height = payload.height;
				asset.data = deepClone(payload.data);
				asset.fileDataType = payload.fileDataType;
				asset.fileData = payload.fileData; // blobはimmutableなので多分deepCloneの必要なし
				asset.hash = payload.hash;
			},
			undo(state) {
				// TODO
			},
		};
	},
});

const addMacroCommandDef = defineCommand<{ groupId?: GsGroupNode['id']; id: string; }>({
	label: 'Add macro',
	create: (payload) => {
		return {
			execute(state) {
				const group = state.nodes.value.find(node => node.id === payload.groupId) as GsGroupNode;
				(group ? group.macros : state.macros.value).push({
					id: payload.id,
					type: 'number',
					typeOptions: {},
					label: 'Macro',
					name: 'macro',
					value: {
						type: 'literal',
						value: 0,
					},
				});
			},
			undo(state) {
				state.macros.value = state.macros.value.filter(macro => macro.id !== payload.id);
			},
		};
	},
});

const removeMacroCommandDef = defineCommand<{ groupId?: GsGroupNode['id']; macroId: string }>({
	label: 'Remove macro',
	create: (payload) => {
		return {
			execute(state) {
				const group = state.nodes.value.find(node => node.id === payload.groupId) as GsGroupNode;
				if (group) {
					group.macros = group.macros.filter(macro => macro.id !== payload.macroId);
				} else {
					state.macros.value = state.macros.value.filter(macro => macro.id !== payload.macroId);
				}
			},
			undo(state) {
				// TODO
			},
		};
	},
});

const toggleMacroValueTypeCommandDef = defineCommand<{ groupId?: GsGroupNode['id']; macroId: string }>({
	label: 'Toggle macro value type',
	create: (payload) => {
		return {
			execute(state) {
				const group = state.nodes.value.find(node => node.id === payload.groupId) as GsGroupNode;
				const macro = (group ? group.macros : state.macros.value).find(macro => macro.id === payload.macroId)!;
				const isLiteral = macro.value.type === 'literal';
				if (isLiteral) {
					macro.value = {
						type: 'expression',
						value: '',
					};
				} else {
					macro.value = {
						type: 'literal',
						value: genEmptyValue(macro),
					};
				}
			},
			undo(state) {
				// TODO
			},
		};
	},
});

const updateMacroAsLiteralCommandDef = defineCommand<{ groupId?: GsGroupNode['id']; macroId: string; value: any }>({
	label: 'Update macro as literal',
	create: (payload) => {
		return {
			execute(state) {
				const group = state.nodes.value.find(node => node.id === payload.groupId) as GsGroupNode;
				const macro = (group ? group.macros : state.macros.value).find(macro => macro.id === payload.macroId)!;
				macro.value = {
					type: 'literal',
					value: deepClone(payload.value),
				};
			},
			undo(state) {
				// TODO
			},
		};
	},
});

const updateMacroAsExpressionCommandDef = defineCommand<{ groupId?: GsGroupNode['id']; macroId: string; value: any }>({
	label: 'Update macro as expression',
	create: (payload) => {
		return {
			execute(state) {
				const group = state.nodes.value.find(node => node.id === payload.groupId) as GsGroupNode;
				const macro = (group ? group.macros : state.macros.value).find(macro => macro.id === payload.macroId)!;
				macro.value = {
					type: 'expression',
					value: payload.value,
				};
			},
			undo(state) {
				// TODO
			},
		};
	},
});

const updateMacroLabelCommandDef = defineCommand<{ groupId?: GsGroupNode['id']; macroId: string; value: string }>({
	label: 'Update macro label',
	create: (payload) => {
		return {
			execute(state) {
				const group = state.nodes.value.find(node => node.id === payload.groupId) as GsGroupNode;
				const macro = (group ? group.macros : state.macros.value).find(macro => macro.id === payload.macroId)!;
				macro.label = payload.value;
			},
			undo(state) {
				// TODO
			},
		};
	},
});

const updateMacroNameCommandDef = defineCommand<{ groupId?: GsGroupNode['id']; macroId: string; value: string }>({
	label: 'Update macro name',
	create: (payload) => {
		return {
			execute(state) {
				const group = state.nodes.value.find(node => node.id === payload.groupId) as GsGroupNode;
				const macro = (group ? group.macros : state.macros.value).find(macro => macro.id === payload.macroId)!;
				macro.name = payload.value;
			},
			undo(state) {
				// TODO
			},
		};
	},
});

const updateMacroTypeCommandDef = defineCommand<{ groupId?: GsGroupNode['id']; macroId: string; value: FxParamDataType }>({
	label: 'Update macro type',
	create: (payload) => {
		return {
			execute(state) {
				const group = state.nodes.value.find(node => node.id === payload.groupId) as GsGroupNode;
				const macro = (group ? group.macros : state.macros.value).find(macro => macro.id === payload.macroId)!;
				macro.type = payload.value;
				macro.value = {
					type: 'literal',
					value: genEmptyValue(macro),
				};
			},
			undo(state) {
				// TODO
			},
		};
	},
});

const updateMacroTypeOptionCommandDef = defineCommand<{ groupId?: GsGroupNode['id']; macroId: string; key: string; value: any }>({
	label: 'Update macro type option',
	create: (payload) => {
		return {
			execute(state) {
				const group = state.nodes.value.find(node => node.id === payload.groupId) as GsGroupNode;
				const macro = (group ? group.macros : state.macros.value).find(macro => macro.id === payload.macroId)!;
				macro.typeOptions[payload.key] = deepClone(payload.value);
			},
			undo(state) {
				// TODO
			},
		};
	},
});

const changeParamValueTypeCommandDef = defineCommand<{ nodeId: GsNode['id']; param: string; type: 'literal' | 'expression' | 'automation' }>({
	label: 'Change param value type',
	create: (payload) => {
		return {
			execute(state) {
				const node = stateUtility.findNode(state, payload.nodeId)! as GsFxNode;
				const currentValue = node.params[payload.param];
				const defaultValue = deepClone(fxs[node.fx].getDefaultParams()[payload.param]);
				const emptyValue = genEmptyValue(fxs[node.fx].paramDefs[payload.param]);
				if (payload.type === 'expression') {
					node.params[payload.param] = {
						type: 'expression',
						value: currentValue.type === 'literal' ? AiSON.stringify(currentValue.value) : defaultValue.type === 'literal' ? AiSON.stringify(defaultValue.value) : AiSON.stringify(emptyValue),
					};
				} else if (payload.type === 'literal') {
					node.params[payload.param] = {
						type: 'literal',
						value: defaultValue, // TODO: currentValueがexpressionだった場合評価した値を入れる
					};
				} else if (payload.type === 'automation') {
					node.params[payload.param] = {
						type: 'automation',
						value: null,
					};
				}
			},
			undo(state) {
				// TODO
			},
		};
	},
});

const updateParamAsLiteralCommandDef = defineCommand<{ nodeId: GsNode['id']; param: string; value: any }>({
	label: 'Update param as literal',
	create: (payload) => {
		let before: GsFxNode['params'][string];
		return {
			execute(state) {
				const node = stateUtility.findNode(state, payload.nodeId) as GsFxNode;
				before = deepClone(node.params[payload.param]);
				node.params[payload.param] = {
					type: 'literal',
					value: deepClone(payload.value),
				};
			},
			undo(state) {
				const node = stateUtility.findNode(state, payload.nodeId) as GsFxNode;
				node.params[payload.param] = deepClone(before);
			},
		};
	},
});

const updateParamAsExpressionCommandDef = defineCommand<{ nodeId: GsNode['id']; param: string; value: any }>({
	label: 'Update param as expression',
	create: (payload) => {
		return {
			execute(state) {
				const node = stateUtility.findNode(state, payload.nodeId) as GsFxNode;
				node.params[payload.param] = {
					type: 'expression',
					value: payload.value,
				};
			},
			undo(state) {
				// TODO
			},
		};
	},
});

const updateParamAsAutomationCommandDef = defineCommand<{ nodeId: GsNode['id']; param: string; value: any }>({
	label: 'Update param as automation',
	create: (payload) => {
		return {
			execute(state) {
				const node = stateUtility.findNode(state, payload.nodeId) as GsFxNode;
				node.params[payload.param] = {
					type: 'automation',
					value: payload.value,
				};
			},
			undo(state) {
				// TODO
			},
		};
	},
});

export const COMMAND_DEFS = {
	addFxNode: addFxNodeCommandDef,
	moveNode: moveNodeCommandDef,
	removeNode: removeNodeCommandDef,
	addGroupNode: addGroupNodeCommandDef,
	updateGroupName: updateGroupNameCommandDef,
	addAsset: addAssetCommandDef,
	removeAsset: removeAssetCommandDef,
	renameAsset: renameAssetCommandDef,
	replaceAsset: replaceAssetCommandDef,
	addMacro: addMacroCommandDef,
	removeMacro: removeMacroCommandDef,
	toggleMacroValueType: toggleMacroValueTypeCommandDef,
	updateMacroAsLiteral: updateMacroAsLiteralCommandDef,
	updateMacroAsExpression: updateMacroAsExpressionCommandDef,
	updateMacroLabel: updateMacroLabelCommandDef,
	updateMacroName: updateMacroNameCommandDef,
	updateMacroType: updateMacroTypeCommandDef,
	updateMacroTypeOption: updateMacroTypeOptionCommandDef,
	changeParamValueType: changeParamValueTypeCommandDef,
	updateParamAsLiteral: updateParamAsLiteralCommandDef,
	updateParamAsExpression: updateParamAsExpressionCommandDef,
	updateParamAsAutomation: updateParamAsAutomationCommandDef,
};
