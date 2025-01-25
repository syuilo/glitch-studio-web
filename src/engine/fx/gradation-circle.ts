import { defineGpuFx } from '@/engine/fx-utils';
import shader from './gradation-circle.glsl';

export default defineGpuFx({
	name: 'gradationCircle',
	displayName: 'Gradation circle',
	category: 'draw',
	paramDefs: {
		posX: {
			label: 'Pos X',
			type: 'range' as const,
			step: 0.01,
			max: 1,
			default: { type: 'literal' as const, value: 0.5 }
		},
		posY: {
			label: 'Pos Y',
			type: 'range' as const,
			step: 0.01,
			max: 1,
			default: { type: 'literal' as const, value: 0.5 }
		},
		size: {
			label: 'Size',
			type: 'wh' as const,
			step: 0.01,
			max: 2,
			default: { type: 'literal' as const, value: [0.5, 0.5] }
		},
	},
	shader,
	setup: ({gl, params, shaderProgram }) => {
		const u_pos = gl.getUniformLocation(shaderProgram, 'u_pos');
		gl.uniform2f(u_pos, params.posX, params.posY);
		const u_size = gl.getUniformLocation(shaderProgram, 'u_size');
		gl.uniform2f(u_size, params.size[0], params.size[1]);
	},
});
