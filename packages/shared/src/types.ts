
export type FxParamDataType = 'number' | 'range' | 'range2' | 'enum' | 'bool' | 'blendMode' | 'signal' | 'xy' | 'wh' | 'color' | 'vector' | 'seed' | 'time' | 'image' | 'video' | 'node' | 'nodes';

export type FxParamValue = {
	type: 'literal';
	value: any;
} | {
	type: 'expression';
	value: string;
} | {
	type: 'automation';
	value: string | null;
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
	data: Uint8Array | null;
	fileDataType: string;
	fileData: Blob;
	hash?: string;
};

export type FxParamDef = Record<string, any> & {
	type: FxParamDataType;
	label: string;
	default?: FxParamValue;
	visibility?: (state: Record<string, FxParamValue>) => boolean;
};

export type FxParamDefs = Record<string, FxParamDef>;

type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export type EvaledParams<T extends FxParamDefs> = {
	[K in keyof T]:
	T[K]['type'] extends 'node' ? string :
	T[K]['type'] extends 'nodes' ? string[] :
	T[K]['type'] extends 'image' ? string :
	T[K]['type'] extends 'video' ? string :
	T[K]['type'] extends 'range' ? number :
	T[K]['type'] extends 'bool' ? boolean :
	any;
};

export type InputNodeTexs<T extends FxParamDefs> = OmitNever<{
	[K in keyof T]:
	T[K]['type'] extends 'node' ? WebGLTexture :
	T[K]['type'] extends 'nodes' ? WebGLTexture[] :
	never;
}>;

export type GsKeyframe = {
	id: string;
	frame: number;
	value: number;
	bezierControlPointA: [number, number];
	bezierControlPointB: [number, number];
};

export type GsAutomation = {
	id: string;
	name: string;
	keyframes: GsKeyframe[];
};
