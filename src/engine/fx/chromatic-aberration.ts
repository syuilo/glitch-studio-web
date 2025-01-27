import { defineGpuFx, basicParamDefs } from '@/engine/fx-utils';
import shader from './chromatic-aberration.glsl';

export default defineGpuFx({
	name: 'chromaticAberration',
	displayName: 'Chromatic Aberration',
	category: 'glitch',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
		},
		amount: {
			label: 'Amount',
			type: 'range' as const,
			step: 0.01,
			max: 1,
			default: { type: 'literal' as const, value: 0.1 }
		},
		rStrength: {
			label: 'R strength',
			type: 'range' as const,
			step: 0.01,
			min: -10,
			max: 10,
			default: { type: 'literal' as const, value: 1 }
		},
		gStrength: {
			label: 'G strength',
			type: 'range' as const,
			step: 0.01,
			min: -10,
			max: 10,
			default: { type: 'literal' as const, value: 1.5 }
		},
		bStrength: {
			label: 'B strength',
			type: 'range' as const,
			step: 0.01,
			min: -10,
			max: 10,
			default: { type: 'literal' as const, value: 2 }
		},
		samples: {
			label: 'Samples',
			type: 'number' as const,
			min: 1,
			max: 100,
			default: { type: 'literal' as const, value: 32 }
		},
		start: {
			label: 'Start',
			type: 'range' as const,
			step: 0.01,
			max: 1,
			default: { type: 'literal' as const, value: 0 }
		},
		vector: {
			label: 'Vector',
			type: 'vector' as const,
			default: { type: 'literal' as const, value: [0, 0] }
		},
		normalize: {
			label: 'Normalize',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: false }
		},
	},
	shader,
	setup: ({ gl, params, shaderProgram, inputNodeTexs }) => {
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.input);
		const u_texture = gl.getUniformLocation(shaderProgram, 'u_texture');
		gl.uniform1i(u_texture, 0);

		const amount = gl.getUniformLocation(shaderProgram, 'u_amount');
		gl.uniform1f(amount, params.amount);

		const rStrength = gl.getUniformLocation(shaderProgram, 'u_r_strength');
		gl.uniform1f(rStrength, params.rStrength);

		const gStrength = gl.getUniformLocation(shaderProgram, 'u_g_strength');
		gl.uniform1f(gStrength, params.gStrength);

		const bStrength = gl.getUniformLocation(shaderProgram, 'u_b_strength');
		gl.uniform1f(bStrength, params.bStrength);

		const samples = gl.getUniformLocation(shaderProgram, 'u_samples');
		gl.uniform1i(samples, params.samples);

		const start = gl.getUniformLocation(shaderProgram, 'u_start');
		gl.uniform1f(start, params.start);

		const vector = gl.getUniformLocation(shaderProgram, 'u_vector');
		gl.uniform2fv(vector, params.vector);

		const normalize = gl.getUniformLocation(shaderProgram, 'u_normalize');
		gl.uniform1i(normalize, params.normalize ? 1 : 0);
	},
});
