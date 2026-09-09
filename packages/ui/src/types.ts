import { Ref } from 'vue';
import { GsNode } from '../../renderer/src/renderer.js';
import { GsAutomation } from './engine/types.ts';

export type AppState = {
	resolution: Ref<{ width: number; height: number }>;
	assets: Ref<Asset[]>;
	nodes: Ref<GsNode[]>;
	macros: Ref<Macro[]>;
	automations: Ref<GsAutomation[]>;
};
