import { basicParamDefs, defineGpuFx } from '@/engine/fx-utils';
import shader from './color-clamp.glsl';

export default defineGpuFx({
	name: 'colorClamp',
	displayName: 'Color clamp',
	category: 'color',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
			default: { type: 'literal' as const, value: null }
		},
		rLevel: {
			label: 'R',
			type: 'range2' as const,
			step: 0.01,
			min: 0,
			max: 1,
			default: { type: 'literal' as const, value: [0, 1] }
		},
		gLevel: {
			label: 'G',
			type: 'range2' as const,
			step: 0.01,
			min: 0,
			max: 1,
			default: { type: 'literal' as const, value: [0, 1] }
		},
		bLevel: {
			label: 'B',
			type: 'range2' as const,
			step: 0.01,
			min: 0,
			max: 1,
			default: { type: 'literal' as const, value: [0, 1] }
		},
		aLevel: {
			label: 'A',
			type: 'range2' as const,
			step: 0.01,
			min: 0,
			max: 1,
			default: { type: 'literal' as const, value: [0, 1] }
		},
	},
	shader,
	setup: ({ gl, params, shaderProgram, inputNodeTexs }) => {
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.input);

		const rMin = gl.getUniformLocation(shaderProgram, 'rMin');
		gl.uniform1f(rMin, params.rLevel[0]);
		const rMax = gl.getUniformLocation(shaderProgram, 'rMax');
		gl.uniform1f(rMax, params.rLevel[1]);
		const gMin = gl.getUniformLocation(shaderProgram, 'gMin');
		gl.uniform1f(gMin, params.gLevel[0]);
		const gMax = gl.getUniformLocation(shaderProgram, 'gMax');
		gl.uniform1f(gMax, params.gLevel[1]);
		const bMin = gl.getUniformLocation(shaderProgram, 'bMin');
		gl.uniform1f(bMin, params.bLevel[0]);
		const bMax = gl.getUniformLocation(shaderProgram, 'bMax');
		gl.uniform1f(bMax, params.bLevel[1]);
		const aMin = gl.getUniformLocation(shaderProgram, 'aMin');
		gl.uniform1f(aMin, params.aLevel[0]);
		const aMax = gl.getUniformLocation(shaderProgram, 'aMax');
		gl.uniform1f(aMax, params.aLevel[1]);
	},
});
