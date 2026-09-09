import type { Asset, GsNode, Macro, GsAutomation } from '@glitch/shared/types.ts';
import type { Ref } from 'vue';

export type AppState = {
	resolution: Ref<{ width: number; height: number }>;
	assets: Ref<Asset[]>;
	nodes: Ref<GsNode[]>;
	macros: Ref<Macro[]>;
	automations: Ref<GsAutomation[]>;
};
