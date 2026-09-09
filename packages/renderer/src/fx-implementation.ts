import type { EffectDefinition, EffectOptionsSchema, GetEffectOptionsSchemaValues } from '@glitch/shared/fx-definition.ts';

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

export type EffectImplementation<Definition extends EffectDefinition = EffectDefinition, Options extends EffectOptionsSchema = Definition extends EffectDefinition<infer O> ? O : any> = {
	disableCache?: boolean;
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

export function implementEffect<Definition extends EffectDefinition>(def: EffectImplementation<Definition>): EffectImplementation<Definition> {
	return def;
}
