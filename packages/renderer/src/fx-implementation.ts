import type { BlendModeOptionSchema, FitModeOptionSchema, BooleanOptionSchema, ColorOptionSchema, EffectDefinition, EffectOptionsSchema, EnumOptionSchema, ImageOptionSchema, NodeOptionSchema, NumberOptionSchema, RangeOptionSchema, SeedOptionSchema, SignalOptionSchema, VectorOptionSchema, PlayerOptionSchema } from '@glitch/shared/fx-definition.ts';
import type { AudioHistory } from '@glitch/shared/audio-history.ts';
import type { EffectStatus } from '@glitch/shared/effect-status.ts';

type RuntimeEffectOptionValue<T extends EffectOptionsSchema[string]> =
	T extends { canNode: true } ? GPUTexture :
	T extends NumberOptionSchema ? number :
	T extends BooleanOptionSchema ? boolean :
	T extends ColorOptionSchema ? Readonly<[number, number, number, number]> :
	T extends VectorOptionSchema ? Readonly<[number, number]> :
	T extends SignalOptionSchema ? Readonly<[boolean, boolean, boolean]> :
	T extends BlendModeOptionSchema ? string :
	T extends FitModeOptionSchema ? 'stretch' | 'cover' | 'contain' :
	T extends SeedOptionSchema ? number :
	T extends EnumOptionSchema ? T['options'][number]['value'] :
	T extends RangeOptionSchema ? number :
	T extends ImageOptionSchema ? GPUTexture | null :
	T extends PlayerOptionSchema ? { videoFrame: VideoFrame | null; audio: AudioHistory | null; } | null :
	T extends NodeOptionSchema ? GPUTexture | null :
	never;

export type GetRuntimeEffectOptionsSchemaValues<T extends EffectOptionsSchema> = {
	[K in keyof T]: RuntimeEffectOptionValue<T[K]>;
};

export type EffectInstance<Options extends EffectOptionsSchema = any> = {
	readonly cacheVersion?: number;
	render: (ctx: {
		time: number;
		timeDelta: number;
		pointerPosition: { x: number; y: number; };
		pointerVector: { x: number; y: number; };
		previousFrameTexture?: GPUTexture;
		previousFrameTextureView?: GPUTextureView;
		outputTextureView: GPUTextureView;
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
		reportStatus: (status: EffectStatus) => void;
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
