export type NumberOptionSchema = {
	type: 'number';
	label: string;
	min?: number;
	max?: number;
	step?: number;
	canNode?: boolean;
};

export type BooleanOptionSchema = {
	type: 'bool';
	label: string;
};

export type ColorOptionSchema = {
	type: 'color';
	label: string;
};

export type VectorOptionSchema = {
	type: 'vector';
	label: string;
	min?: number;
	max?: number;
	step?: number;
	canNode?: boolean;
};

export type SignalOptionSchema = {
	type: 'signal';
	label: string;
};

export type BlendModeOptionSchema = {
	type: 'blendMode';
	label: string;
};

export type SeedOptionSchema = {
	type: 'seed';
	label: string;
};

export type EnumOptionSchema = {
	type: 'enum';
	label: string;
	options: readonly {
		value: string | number | null;
		label: string;
	}[];
};

export type RangeOptionSchema = {
	type: 'range';
	label: string;
	min: number;
	max: number;
	step?: number;
	canNode?: boolean;
};

export type ImageOptionSchema = {
	type: 'image';
	label: string;
};

export type PlayerOptionSchema = {
	type: 'player';
	label: string;
};

export type NodeOptionSchema = {
	type: 'node';
	label: string;
	dataType: 'color' | 'scalar' | 'vector' | 'any';
	primary?: boolean;
};

export type EffectOptionsSchema = Record<string,
	NumberOptionSchema |
	BooleanOptionSchema |
	ColorOptionSchema |
	VectorOptionSchema |
	SignalOptionSchema |
	BlendModeOptionSchema |
	SeedOptionSchema |
	EnumOptionSchema |
	RangeOptionSchema |
	ImageOptionSchema |
	PlayerOptionSchema |
	NodeOptionSchema
>;

// A type parameter distributes the conditional over unions of option schemas.
type EffectOptionValue<T extends EffectOptionsSchema[string]> =
	T extends NumberOptionSchema ? number :
	T extends BooleanOptionSchema ? boolean :
	T extends ColorOptionSchema ? Readonly<[number, number, number, number]> :
	T extends VectorOptionSchema ? Readonly<[number, number]> :
	T extends SignalOptionSchema ? Readonly<[boolean, boolean, boolean]> :
	T extends BlendModeOptionSchema ? string :
	T extends SeedOptionSchema ? number :
	T extends EnumOptionSchema ? T['options'][number]['value'] :
	T extends RangeOptionSchema ? number :
	T extends ImageOptionSchema ? null :
	T extends PlayerOptionSchema ? null :
	T extends NodeOptionSchema ? null :
	never;

export type GetEffectOptionsSchemaValues<T extends EffectOptionsSchema> = {
	[K in keyof T]: EffectOptionValue<T[K]>;
};

type EffectOptionsSchemaDefaultValue<T extends EffectOptionsSchema, K extends keyof T> =
	{ type: 'literal'; value: GetEffectOptionsSchemaValues<T>[K] } |
	{ type: 'expression'; expression: string } |
	{ type: 'automation'; automationId: string | null } |
	{ type: 'node'; nodeId: string | null };

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
	outputs: Record<string, {	dataType: 'color' | 'scalar' | 'vector' | 'any'; }>;
};

export function defineEffect<const OpSc extends EffectOptionsSchema>(def: EffectDefinition<OpSc>): EffectDefinition<OpSc> {
	return def;
}
