import { defineGpuFx } from '@/engine/fx-utils';
import shader from './quadtreeFilter.glsl';

export default defineGpuFx({
	name: 'quadtreeFilter',
	displayName: 'Quadtree filter',
	category: 'effect',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
			default: { type: 'literal' as const, value: null }
		},
		threshold: {
			label: 'Thresold',
			type: 'range' as const,
			step: 0.00001,
			min: 0,
			max: 0.15,
			default: { type: 'literal' as const, value: 0.005 }
		},
		minDivisions: {
			label: 'Min divisions',
			type: 'range' as const,
			step: 1,
			min: 1,
			max: 64,
			default: { type: 'literal' as const, value: 4 }
		},
		maxIterations: {
			label: 'Max iterations',
			type: 'range' as const,
			step: 1,
			min: 1,
			max: 16,
			default: { type: 'literal' as const, value: 10 }
		},
		borderWidth: {
			label: 'Border width',
			type: 'range' as const,
			step: 0.001,
			min: 0,
			max: 1,
			default: { type: 'literal' as const, value: 0 }
		},
		borderAbsolute: {
			label: 'Border absolute',
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

		const u_min_divisions = gl.getUniformLocation(shaderProgram, 'u_min_divisions');
		gl.uniform1f(u_min_divisions, params.minDivisions);

		const u_max_iterations = gl.getUniformLocation(shaderProgram, 'u_max_iterations');
		gl.uniform1i(u_max_iterations, params.maxIterations);

		const u_border_width = gl.getUniformLocation(shaderProgram, 'u_border_width');
		gl.uniform1f(u_border_width, params.borderWidth);

		const u_border_absolute = gl.getUniformLocation(shaderProgram, 'u_border_absolute');
		gl.uniform1i(u_border_absolute, params.borderAbsolute ? 1 : 0);
	},
});
