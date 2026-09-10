import type { EffectDefinition, EffectOptionsSchema, GetEffectOptionsSchemaValues } from '@glitch/shared/fx-definition.ts';

export type EffectInstance<Options extends EffectOptionsSchema = any> = {
	render: (ctx: {
		time: number;
		timeDelta: number;
		pointerPosition: { x: number; y: number; };
		pointerVector: { x: number; y: number; };
		previousFrameTexture?: GPUTexture;
		commandEncoder: GPUCommandEncoder;
		createPassEncoder: (commandEncoder: GPUCommandEncoder, descriptor?: GPURenderPassDescriptor) => GPURenderPassEncoder;
		createComputePassEncoder: (commandEncoder: GPUCommandEncoder, descriptor?: GPUComputePassDescriptor) => GPUComputePassEncoder;
		params: GetEffectOptionsSchemaValues<Options>;
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
		params: GetEffectOptionsSchemaValues<Options>;
		fallbackTexture: GPUTexture;
	}) => EffectInstance<Options>;
};

export function implementEffect<Definition extends Pick<EffectDefinition, 'paramDefs'>>(def: EffectImplementation<Definition>): EffectImplementation<Definition> {
	return def;
}
