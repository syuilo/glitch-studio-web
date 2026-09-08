import { Ref, ref, markRaw, Component, reactive, watch, shallowRef, triggerRef } from 'vue';
import { AiSON } from '@syuilo/aiscript';
import { genId } from './utility/id.ts';
import { fxs } from './engine/fxs';
import { GsFxNode, GsGroupNode, GsNode } from './engine/renderer';
import { loadProjectFile, saveProjectFile, decodeAssets } from './api';
import { RawProject } from './settings';
import { Engine } from './engine/engine.ts';
import { deepClone } from './utility/deep-clone.ts';
import { Asset, Macro } from './types.ts';
import { GsAutomation } from './engine/types.ts';
import { WorkspaceDivider } from './types/workspace.ts';
import { genEmptyValue } from './utility/misc.ts';
import * as ui from '@/ui.js';
import { version } from '@/version';
import * as api from '@/api.js';

type TODO = any;

type AppState = {
	resolution: Ref<{ width: number; height: number }>;
	assets: Ref<Asset[]>;
	nodes: Ref<GsNode[]>;
	macros: Ref<Macro[]>;
	automations: Ref<GsAutomation[]>;
};

type CommandDef<Payload> = {
	label: string;
	create: (payload: Payload) => {
		execute(state: AppState, merge?: { payload: Payload }): void;
		undo(state: AppState): void;
	};
};

type CommandLog = {
	type: string;
	date: number;
	execute: (state: AppState, merge?: { payload: any }) => void;
	undo: (state: AppState) => void;
	mergeKey?: string | null;
};

function defineCommand<Payload>(def: CommandDef<Payload>) {
	return def;
}

const stateUtility = {
	findNode: (state: AppState, nodeId: string): GsNode | undefined => {
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
		return search(state.nodes.value);
	},
};

const addFxNodeCommandDef = defineCommand<{ id: string; fx: string; params?: Record<string, any>; groupId?: string }>({
	label: 'Add fx node',
	create: (payload) => {
		return {
			execute(state) {
				const paramDefs = fxs[payload.fx].paramDefs as FxParamDefs;
				const group = payload.groupId ? state.nodes.value.find(node => node.type === 'group' && node.id === payload.groupId) as GsGroupNode : undefined;

				const params = {} as GsFxNode['params'];
				const defaultParams = fxs[payload.fx].getDefaultParams();

				for (const [k, v] of Object.entries(paramDefs)) {
					if (defaultParams[k] != null) {
						params[k] = defaultParams[k];
					} else if (v.type === 'seed') {
						params[k] = { type: 'literal', value: Math.floor(Math.random() * 16384) };
					} else if (v.type === 'time') {
						params[k] = { type: 'expression', value: 'TIME' };
					} else if (v.type === 'node' && v.primary) {
						if ((group ? group.nodes : state.nodes.value).length > 0) {
							params[k] = { type: 'literal', value: (group ? group.nodes : state.nodes.value).at(-1).id };
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
							...(payload.params ?? {}),
						},
						x: 0,
						y: 0,
					});
				} else {
					state.nodes.value.push({
						id: payload.id,
						isEnabled: true,
						type: 'fx',
						fx: payload.fx,
						params: {
							...params,
							...(payload.params ?? {}),
						},
						x: 0,
						y: 0,
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

const removeFxNodeCommandDef = defineCommand<{ nodeId: string }>({
	label: 'Remove fx node',
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
					});
				} else {
					state.nodes.value.push({
						id: payload.id,
						isEnabled: true,
						type: 'group',
						nodes: [],
						macros: [],
					});
				}
			},
			undo(state) {
				state.nodes.value = state.nodes.value.filter(node => node.id !== payload.id);
			},
		};
	},
});

const addAssetCommandDef = defineCommand<{ id: string; name: string; width: number; height: number; data: any; fileDataType: string; fileData: any; hash: string }>({
	label: 'Add asset',
	create: (payload) => {
		return {
			execute(state) {
				state.assets.value.push({
					id: payload.id,
					name: payload.name,
					width: payload.width,
					height: payload.height,
					data: payload.data,
					fileDataType: payload.fileDataType,
					fileData: payload.fileData,
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
					const imageParams = Object.entries(fxs[node.fx].paramDefs).filter(([k, v]) => v.type === 'image').map(([k, v]) => k);
					for (const p of imageParams) {
						if (node.params[p].type === 'literal' && node.params[p].value === payload.assetId) {
							node.params[p].value = null;
						}
					}
				}

				// そのAssetを参照しているマクロをnullにする
				for (const macro of state.macros.value.filter(m => m.type === 'image' && m.value.type === 'literal')) {
					macro.value = null;
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

const replaceAssetCommandDef = defineCommand<{ assetId: string; width: number; height: number; data: any; fileDataType: string; fileData: any; hash: string }>({
	label: 'Replace asset',
	create: (payload) => {
		return {
			execute(state) {
				const asset = state.assets.value.find(asset => asset.id === payload.assetId)!;
				asset.width = payload.width;
				asset.height = payload.height;
				asset.data = payload.data;
				asset.fileDataType = payload.fileDataType;
				asset.fileData = payload.fileData;
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
					value: payload.value,
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

const updateMacroTypeCommandDef = defineCommand<{ groupId?: GsGroupNode['id']; macroId: string; value: string }>({
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
				macro.typeOptions[payload.key] = payload.value;
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
				const defaultValue = fxs[node.fx].getDefaultParams()[payload.param];
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
			execute(state, merge) {
				const node = stateUtility.findNode(state, payload.nodeId) as GsFxNode;
				if (merge == null) before = node.params[payload.param];
				node.params[payload.param] = {
					type: 'literal',
					value: merge?.payload.value ?? payload.value,
				};
			},
			undo(state) {
				const node = stateUtility.findNode(state, payload.nodeId) as GsFxNode;
				node.params[payload.param] = before;
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
	removeFxNode: removeFxNodeCommandDef,
	addGroupNode: addGroupNodeCommandDef,
	addAsset: addAssetCommandDef,
	removeAsset: removeAssetCommandDef,
	renameAsset: renameAssetCommandDef,
	replaceAsset: replaceAssetCommandDef,
	addMacro: addMacroCommandDef,
	removeMacro: removeMacroCommandDef,
	updateMacroLabel: updateMacroLabelCommandDef,
	updateMacroName: updateMacroNameCommandDef,
	updateMacroType: updateMacroTypeCommandDef,
	updateMacroTypeOption: updateMacroTypeOptionCommandDef,
	changeParamValueType: changeParamValueTypeCommandDef,
	updateParamAsLiteral: updateParamAsLiteralCommandDef,
	updateParamAsExpression: updateParamAsExpressionCommandDef,
	updateParamAsAutomation: updateParamAsAutomationCommandDef,
};

class AppContext {
	public state: AppState;
	public undoStack = shallowRef([] as CommandLog[]);
	public redoStack = shallowRef([] as CommandLog[]);
	private maxUndoStackSize = 100;

	// とりあえずundo/redo対象にする必要なさそうだからstate外で管理
	public workspaceDefinition = ref<WorkspaceDivider>({
		id: 'root',
		direction: 'horizontal',
		children: [{
			id: '938e3eedc00d4287885b6894ee3ea8c3',
			ratio: 0.55,
			type: 'preview',
		}, {
			id: '441518aeb37940b2af7fb0027fd530a9',
			ratio: 0.25,
			type: 'nodesEditor',
		}, {
			id: '8aec4dd7bf82460eba420680fda4f652',
			ratio: 0.2,
			type: null,
			direction: 'vertical',
			children: [{
				id: '0f34c5f4c9cb449683c7f1281851b759',
				ratio: 0.25,
				type: 'histogram',
			}, {
				id: 'b3d6059aaa554ae79441286cd2beb685',
				ratio: 0.25,
				type: 'waveform',
			}, {
				id: '47edf72197d94d28b6b2811bfecc97e5',
				ratio: 0.25,
				type: 'stats',
			}, {
				id: 'test',
				ratio: 0.25,
				type: 'commandLog',
			}],
		}],
	});

	constructor() {
		this.state = {
			resolution: ref<{ width: number; height: number }>({ width: 2048, height: 2048 }),
			assets: ref<Asset[]>([]), // TODO: バイナリをリアクティブでwrapするのをやめる
			nodes: ref<GsNode[]>([]),
			macros: ref<Macro[]>([]),
			automations: ref<GsAutomation[]>([]),
		};
	}

	private pushCommand(type: string, execute: (state: AppState, merge?: { payload: any }) => void, undo: (state: AppState) => void, mergeKey?: string | null) {
		this.undoStack.value.push({
			type,
			date: Date.now(),
			execute,
			undo,
			mergeKey,
		});
		triggerRef(this.undoStack);
		this.redoStack.value = [];
		if (this.undoStack.value.length > this.maxUndoStackSize) {
			this.undoStack.value.shift();
			triggerRef(this.undoStack);
		}
	}

	public commit<T extends keyof typeof COMMAND_DEFS>(type: T, payload: Parameters<typeof COMMAND_DEFS[T]['create']>[0], mergeKey?: string | null) {
		const latest = this.undoStack.value.at(-1);
		if (latest != null && mergeKey != null && latest.mergeKey === mergeKey) {
			latest.execute(this.state, { payload });
			return;
		}
		const commandDef = COMMAND_DEFS[type] as CommandDef<any>;
		const command = commandDef.create(deepClone(payload));
		command.execute(this.state);
		this.pushCommand(type, command.execute, command.undo, mergeKey);
		console.log('Committed command:', type, deepClone(payload));
	}

	public undo() {
		const command = this.undoStack.value.pop();
		triggerRef(this.undoStack);
		if (command == null) return;
		command.undo(this.state);
		this.redoStack.value.push(command);
		triggerRef(this.redoStack);
	}

	public redo() {
		const command = this.redoStack.value.pop();
		triggerRef(this.redoStack);
		if (command == null) return;
		command.execute(this.state);
		this.undoStack.value.push(command);
		triggerRef(this.undoStack);
	}
}

export const appContext = new AppContext();

(window as any).appContext = appContext; // debug

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
	ui.popupMenu([{
		text: 'Group',
		action: () => {
			appContext.commit('addGroupNode', {
				groupId: group?.id,
				id: genId(),
			});
		},
	}, ...Object.entries(fxs).filter(([_, v]) => v.category === '').map(x => ({
		text: x[1].displayName,
		action: () => {
			appContext.commit('addFxNode', {
				groupId: group?.id,
				fx: x[1].name,
				id: genId(),
			});
		},
	})), {
		type: 'label',
		text: 'Glitch',
	}, ...Object.entries(fxs).filter(([_, v]) => v.category === 'glitch').map(x => ({
		text: x[1].displayName,
		action: () => {
			appContext.commit('addFxNode', {
				groupId: group?.id,
				fx: x[1].name,
				id: genId(),
			});
		},
	})), {
		type: 'label',
		text: 'Effect',
	}, ...Object.entries(fxs).filter(([_, v]) => v.category === 'effect').map(x => ({
		text: x[1].displayName,
		action: () => {
			appContext.commit('addFxNode', {
				groupId: group?.id,
				fx: x[1].name,
				id: genId(),
			});
		},
	})), {
		type: 'label',
		text: 'Draw',
	}, ...Object.entries(fxs).filter(([_, v]) => v.category === 'draw').map(x => ({
		text: x[1].displayName,
		action: () => {
			appContext.commit('addFxNode', {
				groupId: group?.id,
				fx: x[1].name,
				id: genId(),
			});
		},
	})), {
		type: 'label',
		text: 'Color',
	}, ...Object.entries(fxs).filter(([_, v]) => v.category === 'color').map(x => ({
		text: x[1].displayName,
		action: () => {
			appContext.commit('addFxNode', {
				groupId: group?.id,
				fx: x[1].name,
				id: genId(),
			});
		},
	})), {
		type: 'label',
		text: 'Utility',
	}, ...Object.entries(fxs).filter(([_, v]) => v.category === 'utility').map(x => ({
		text: x[1].displayName,
		action: () => {
			appContext.commit('addFxNode', {
				groupId: group?.id,
				fx: x[1].name,
				id: genId(),
			});
		},
	}))], ev.currentTarget ?? ev.target);
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
	engine.fpsLimit = fpsLimit.value;
	engine.stopRenderLoop();
	engine.startRenderLoop();
});

export async function appReady(project: RawProject) {
	window.document.title = `Glitch Studio (${project.name})`;

	appContext.projectId = project.id;
	appContext.projectName = project.name;
	appContext.projectAuthor = project.author;
	appContext.state.resolution.value = project.resolution;
	appContext.state.assets.value = await decodeAssets(project.assets);
	appContext.state.nodes.value = project.nodes;
	appContext.state.macros.value = project.macros;
	appContext.state.automations.value = project.automations;

	watch(appContext.state.nodes, () => {
		engine.updateNodes(deepClone(appContext.state.nodes.value));

		//// TODO: グループ考慮
		//if (store.nodes.some(n => n.type === 'fx' && n.fx === 'webcamera')) {
		//	glitchRenderer.setupWebcam();
		//}
	}, { deep: true, immediate: true });

	watch(appContext.state.macros, () => {
		engine.updateMacros(deepClone(appContext.state.macros.value));
	}, { deep: true, immediate: true });

	watch(appContext.state.automations, () => {
		engine.updateAutomations(deepClone(appContext.state.automations.value));
	}, { deep: true, immediate: true });

	watch(appContext.state.assets, () => {
		engine.updateAssets(deepClone(appContext.state.assets.value));
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
		resolution: { width: 2048, height: 2048 },
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
		resolution: { width: result.width, height: result.height },
	});

	appContext.commit('addAsset', {
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
		appContext.commit('addFxNode', {
			fx: 'image',
			id: genId(),
			params: {
				image: { type: 'literal', value: assetId },
			},
		});
	} else if (result.type.startsWith('video/')) {
		appContext.commit('addFxNode', {
			fx: 'video',
			id: genId(),
			params: {
				video: { type: 'literal', value: assetId },
			},
		});
	}
}
