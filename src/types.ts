export type Image = {
	width: number;
	height: number;
	data: Uint8Array;
};

type FxParamDataType = 'number' | 'range' | 'range2' | 'enum' | 'bool' | 'blendMode' | 'signal' | 'xy' | 'wh' | 'color' | 'seed' | 'image' | 'node' | 'nodes';

export type FxParamValue = {
	type: 'literal' | 'expression' | 'automation';
	value: any;
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
