import { FxParamDefs } from "@/types";
import { GlitchRenderer } from "./renderer";

type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] }

export type EvaledParams<T extends FxParamDefs> = {
	[K in keyof T]:
		T[K]['type'] extends 'node' ? string :
		T[K]['type'] extends 'nodes' ? string[] :
		T[K]['type'] extends 'image' ? string :
		T[K]['type'] extends 'range' ? number :
		T[K]['type'] extends 'bool' ? boolean :
		any;
};

export type InputNodeTexs<T extends FxParamDefs> = OmitNever<{
	[K in keyof T]:
		T[K]['type'] extends 'node' ? WebGLTexture :
		T[K]['type'] extends 'nodes' ? WebGLTexture[] :
		never;
}>;

export type GpuFx<Ps extends FxParamDefs> = {
	name: string;
	displayName: string;
	category: string;
	paramDefs: Ps;
	isGpu: true;
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

export type GsKeyframe = {
	id: string;
	frame: number;
	value: number;
	bezierControlPointA: [number, number];
	bezierControlPointB: [number, number];
};

export type GsAutomation = {
	id: string;
	name: string;
	keyframes: GsKeyframe[];
};
