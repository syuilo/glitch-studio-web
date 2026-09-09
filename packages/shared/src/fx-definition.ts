type NumberOptionSchema = {
	type: 'number';
	label: string;
	min?: number;
	max?: number;
	step?: number;
};

type BooleanOptionSchema = {
	type: 'bool';
	label: string;
};

type ColorOptionSchema = {
	type: 'color';
	label: string;
};

type VectorOptionSchema = {
	type: 'vector';
	label: string;
};

type SignalOptionSchema = {
	type: 'signal';
	label: string;
};

type BlendModeOptionSchema = {
	type: 'blendMode';
	label: string;
};

type SeedOptionSchema = {
	type: 'seed';
	label: string;
};

type EnumOptionSchema = {
	type: 'enum';
	label: string;
	options: {
		value: string | number | null;
		label: string;
	}[];
};

type RangeOptionSchema = {
	type: 'range';
	label: string;
	min: number;
	max: number;
	step?: number;
};

type ImageOptionSchema = {
	type: 'image';
	label: string;
};

type VideoOptionSchema = {
	type: 'video';
	label: string;
};

type NodeOptionSchema = {
	type: 'node';
	label: string;
};

export type EffectOptionsSchema = Record<string, NumberOptionSchema | BooleanOptionSchema | ColorOptionSchema | VectorOptionSchema | SignalOptionSchema | BlendModeOptionSchema | SeedOptionSchema | EnumOptionSchema | RangeOptionSchema | ImageOptionSchema | VideoOptionSchema | NodeOptionSchema>;

export type GetEffectOptionsSchemaValues<T extends EffectOptionsSchema> = {
	[K in keyof T]:
	T[K] extends NumberOptionSchema ? number :
	T[K] extends BooleanOptionSchema ? boolean :
	T[K] extends ColorOptionSchema ? Readonly<[number, number, number]> :
	T[K] extends VectorOptionSchema ? Readonly<[number, number]> :
	T[K] extends SignalOptionSchema ? Readonly<[boolean, boolean, boolean]> :
	T[K] extends BlendModeOptionSchema ? string :
	T[K] extends SeedOptionSchema ? number :
	T[K] extends EnumOptionSchema ? T[K]['options'][number]['value'] :
	T[K] extends RangeOptionSchema ? number :
	T[K] extends ImageOptionSchema ? GPUTexture | null :
	T[K] extends VideoOptionSchema ? VideoFrame | null :
	T[K] extends NodeOptionSchema ? GPUTexture | null :
	never;
};

type EffectOptionsSchemaDefaultValue<T extends EffectOptionsSchema, K extends keyof T> =
	{ type: 'literal'; value: GetEffectOptionsSchemaValues<T>[K] } |
	{ type: 'expression'; value: string } |
	{ type: 'automation'; value: string };

type EffectOptionsSchemaDefaultValues<T extends EffectOptionsSchema> = {
	[K in keyof T as T[K] extends NodeOptionSchema ? never : K]: EffectOptionsSchemaDefaultValue<T, K>;
} & {
	[K in keyof T as T[K] extends NodeOptionSchema ? K : never]?: EffectOptionsSchemaDefaultValue<T, K>;
};

export type EffectDefinition<OpSc extends EffectOptionsSchema = EffectOptionsSchema> = {
	name: string;
	displayName: string;
	category: string;
	paramDefs: OpSc;
	getDefaultParams: () => EffectOptionsSchemaDefaultValues<OpSc>;
};

export function defineEffect<const OpSc extends EffectOptionsSchema>(def: EffectDefinition<OpSc>): EffectDefinition<OpSc> {
	return def;
}
