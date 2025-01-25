import { Asset, FxParamDefs } from '@/types';
import { EvaledParams, GpuFx, InputNodeTexs } from './types';
import { GlitchRenderer } from './renderer';

export const basicParamDefs = {
	_wh: {
		label: 'WH',
		type: 'wh' as const,
		default: { type: 'expression' as const, value: '[WIDTH, HEIGHT]' }
	},
};

export type GpuFxDef<Ps extends FxParamDefs> = {
	name: string;
	displayName: string;
	category: string;
	paramDefs: Ps;
	shader?: string;
	setup?: (args: {
		gl: WebGL2RenderingContext;
		shaderProgram: WebGLProgram;
		w: number;
		h: number;
		params: EvaledParams<Ps>;
		inputNodeTexs: InputNodeTexs<Ps>;
	}) => void;
	main?: (args: {
		renderer: GlitchRenderer;
		gl: WebGL2RenderingContext;
		resultFrameBuffer: WebGLFramebuffer;
		width: number;
		height: number;
		params: EvaledParams<Ps>;
		inputNodeTexs: InputNodeTexs<Ps>;
	}) => void;
};

export function defineGpuFx<Ps extends FxParamDefs>(def: GpuFxDef<Ps>): GpuFx<Ps> {
	return {
		...def,
		paramDefs: {
			...def.paramDefs,
			...basicParamDefs,
		},
		isGpu: true,
	};
}
