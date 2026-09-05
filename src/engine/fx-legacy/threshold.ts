import { defineGpuFx } from '@/engine/fx-utils';
import shader from './threshold.glsl';

export default defineGpuFx({
	name: 'threshold',
	displayName: 'Threshold',
	category: 'color',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
		},
		threshold: {
			label: 'Threshold',
			type: 'range' as const,
			step: 0.01,
			max: 1,
			default: { type: 'literal' as const, value: 0.5 }
		},
		r: {
			label: 'R',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: true }
		},
		g: {
			label: 'G',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: true }
		},
		b: {
			label: 'B',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: true }
		},
		a: {
			label: 'A',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: false }
		},
	},
	shader,
	setup: ({gl, params, shaderProgram, inputNodeTexs }) => {
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.input);

		const u_threshold = gl.getUniformLocation(shaderProgram, 'u_threshold');
		gl.uniform1f(u_threshold, params.threshold);

		const u_r = gl.getUniformLocation(shaderProgram, 'u_r');
		gl.uniform1i(u_r, params.r ? 1 : 0);

		const u_g = gl.getUniformLocation(shaderProgram, 'u_g');
		gl.uniform1i(u_g, params.g ? 1 : 0);

		const u_b = gl.getUniformLocation(shaderProgram, 'u_b');
		gl.uniform1i(u_b, params.b ? 1 : 0);

		const u_a = gl.getUniformLocation(shaderProgram, 'u_a');
		gl.uniform1i(u_a, params.a ? 1 : 0);
	},
});
