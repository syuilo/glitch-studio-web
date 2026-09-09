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
	min?: number;
	max?: number;
	step?: number;
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
	options: readonly {
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
	primary?: boolean;
};

export type EffectOptionsSchema = Record<string, NumberOptionSchema | BooleanOptionSchema | ColorOptionSchema | VectorOptionSchema | SignalOptionSchema | BlendModeOptionSchema | SeedOptionSchema | EnumOptionSchema | RangeOptionSchema | ImageOptionSchema | VideoOptionSchema | NodeOptionSchema>;

// A type parameter distributes the conditional over unions of option schemas.
type EffectOptionValue<T extends EffectOptionsSchema[string]> =
	T extends NumberOptionSchema ? number :
	T extends BooleanOptionSchema ? boolean :
	T extends ColorOptionSchema ? Readonly<[number, number, number]> :
	T extends VectorOptionSchema ? Readonly<[number, number]> :
	T extends SignalOptionSchema ? Readonly<[boolean, boolean, boolean]> :
	T extends BlendModeOptionSchema ? string :
	T extends SeedOptionSchema ? number :
	T extends EnumOptionSchema ? T['options'][number]['value'] :
	T extends RangeOptionSchema ? number :
	T extends ImageOptionSchema ? GPUTexture | null :
	T extends VideoOptionSchema ? VideoFrame | null :
	T extends NodeOptionSchema ? GPUTexture | null :
	never;

export type GetEffectOptionsSchemaValues<T extends EffectOptionsSchema> = {
	[K in keyof T]: EffectOptionValue<T[K]>;
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
