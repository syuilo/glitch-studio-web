import { Ref } from 'vue';
import { GsNode } from './engine/renderer.ts';
import { GsAutomation } from './engine/types.ts';

export type AppState = {
	resolution: Ref<{ width: number; height: number }>;
	assets: Ref<Asset[]>;
	nodes: Ref<GsNode[]>;
	macros: Ref<Macro[]>;
	automations: Ref<GsAutomation[]>;
};

type FxParamDataType = 'number' | 'range' | 'range2' | 'enum' | 'bool' | 'blendMode' | 'signal' | 'xy' | 'wh' | 'color' | 'vector' | 'seed' | 'time' | 'image' | 'video' | 'node' | 'nodes';

export type FxParamValue = {
	type: 'literal';
	value: any;
} | {
	type: 'expression';
	value: string;
} | {
	type: 'automation';
	value: string;
};

export type Macro = {
	id: string;
	label: string;
	name: string;
	type: FxParamDataType;
	typeOptions: Record<string, any>;
	value: FxParamValue;
};

export type Asset = {
	id: string;
	name: string;
	width: number;
	height: number;
	data: Uint8Array;
	fileDataType: string;
	fileData: Blob;
	hash: string;
};

export type FxParamDef = Record<string, any> & {
	type: FxParamDataType;
	label: string;
	default?: FxParamValue;
	visibility?: (state: Record<string, FxParamValue>) => boolean;
};

export type FxParamDefs = Record<string, FxParamDef>;
