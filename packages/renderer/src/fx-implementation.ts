import type { BlendModeOptionSchema, BooleanOptionSchema, ColorOptionSchema, EffectDefinition, EffectOptionsSchema, EnumOptionSchema, ImageOptionSchema, NodeOptionSchema, NumberOptionSchema, RangeOptionSchema, SeedOptionSchema, SignalOptionSchema, VectorOptionSchema, VideoOptionSchema } from '@glitch/shared/fx-definition.ts';

type RuntimeEffectOptionValue<T extends EffectOptionsSchema[string]> =
	T extends { canNode: true } ? GPUTexture :
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

export type GetRuntimeEffectOptionsSchemaValues<T extends EffectOptionsSchema> = {
	[K in keyof T]: RuntimeEffectOptionValue<T[K]>;
};

export type EffectInstance<Options extends EffectOptionsSchema = any> = {
	render: (ctx: {
		time: number;
		timeDelta: number;
		pointerPosition: { x: number; y: number; };
		pointerVector: { x: number; y: number; };
		previousFrameTexture?: GPUTexture;
		previousFrameTextureView?: GPUTextureView;
		commandEncoder: GPUCommandEncoder;
		createPassEncoder: (commandEncoder: GPUCommandEncoder, descriptor?: GPURenderPassDescriptor) => GPURenderPassEncoder;
		createComputePassEncoder: (commandEncoder: GPUCommandEncoder, descriptor?: GPUComputePassDescriptor) => GPUComputePassEncoder;
		params: GetRuntimeEffectOptionsSchemaValues<Options>;
	}) => void;
	dispose: () => void;
};

export type EffectImplementation<Definition extends Pick<EffectDefinition, 'paramDefs'> = EffectDefinition, Options extends EffectOptionsSchema = Definition['paramDefs']> = {
	disableCache?: boolean;
	needsPreviousFrame?: boolean;
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
		params: GetRuntimeEffectOptionsSchemaValues<Options>;
		fallbackTexture: GPUTexture;
	}) => EffectInstance<Options>;
};

export function implementEffect<Definition extends Pick<EffectDefinition, 'paramDefs'>>(def: EffectImplementation<Definition>): EffectImplementation<Definition> {
	return def;
}
