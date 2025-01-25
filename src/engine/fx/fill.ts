import { defineGpuFx } from '@/engine/fx-utils';
import shader from './fill.glsl';

export default defineGpuFx({
	name: 'fill',
	displayName: 'Fill',
	category: 'draw',
	paramDefs: {
		color: {
			label: 'Color',
			type: 'color' as const,
			default: { type: 'literal' as const, value: [0, 255, 0] }
		},
		alpha: {
			label: 'Alpha',
			type: 'range' as const,
			step: 0.02,
			max: 1,
			default: { type: 'literal' as const, value: 1 }
		},
	},
	shader,
	setup: ({gl, params, shaderProgram }) => {
		const color = gl.getUniformLocation(shaderProgram, 'u_color');
		gl.uniform3f(color, params.color[0] / 255, params.color[1] / 255, params.color[2] / 255);
		const alpha = gl.getUniformLocation(shaderProgram, 'u_alpha');
		gl.uniform1f(alpha, params.alpha);
	},
});
