
export const basicParamDefs = {
	_wh: {
		label: 'WH',
		type: 'wh' as const,
		default: { type: 'expression' as const, value: '[WIDTH, HEIGHT]' }
	},
};

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

type EnumOptionSchema = {
	type: 'enum';
	label: string;
	enum: {
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

type NodeOptionSchema = {
	type: 'node';
	label: string;
};

type EffectOptionsSchema = Record<string, NumberOptionSchema | BooleanOptionSchema | ColorOptionSchema | EnumOptionSchema | RangeOptionSchema | ImageOptionSchema | NodeOptionSchema>;

type GetEffectOptionsSchemaValues<T extends EffectOptionsSchema> = {
	[K in keyof T]:
	T[K] extends NumberOptionSchema ? number :
	T[K] extends BooleanOptionSchema ? boolean :
	T[K] extends ColorOptionSchema ? Readonly<[number, number, number]> :
	T[K] extends EnumOptionSchema ? T[K]['enum'][number]['value'] :
	T[K] extends RangeOptionSchema ? number :
	T[K] extends ImageOptionSchema ? GPUTexture | null :
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

export type EffectInstance<Options extends EffectOptionsSchema = any> = {
	render: (ctx: {
		time: number;
		timeDelta: number;
		commandEncoder: GPUCommandEncoder;
		createPassEncoder: (commandEncoder: GPUCommandEncoder, descriptor?: GPURenderPassDescriptor) => GPURenderPassEncoder;
		params: GetEffectOptionsSchemaValues<Options>;
	}) => void;
	dispose: () => void;
};

export type Effect<OpSc extends EffectOptionsSchema = EffectOptionsSchema> = {
	name: string;
	displayName: string;
	category: string;
	paramDefs: OpSc;
	getDefaultParams: () => EffectOptionsSchemaDefaultValues<OpSc>;
	getOut: (args: {
		resolution: { width: number; height: number; },
		wgpu: {
			device: GPUDevice;
			enableFloat32Filtering: boolean;
		};
	}) => GPUTexture;
	shader?: string;
	init: (args: {
		resolution: { width: number; height: number; },
		wgpu: {
			device: GPUDevice;
			context: GPUCanvasContext;
			defaultVertexShaderModule: GPUShaderModule;
			enableFloat32Filtering: boolean;
		};
		params: GetEffectOptionsSchemaValues<OpSc>;
		fallbackTexture: GPUTexture;
	}) => Promise<EffectInstance<OpSc>>;
};

export function defineEffect<const OpSc extends EffectOptionsSchema>(def: Effect<OpSc>): Effect<OpSc> {
	return def;
}
