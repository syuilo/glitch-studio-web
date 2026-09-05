import { defineGpuFx } from '@/engine/fx-utils';
import shader from './bikabika.glsl';

export default defineGpuFx({
	name: 'bikabika',
	displayName: 'Bikabika',
	category: 'glitch',
	paramDefs: {
		time: {
			label: 'Amount',
			type: 'range' as const,
			step: 0.01,
			max: 1,
			default: { type: 'literal' as const, value: 0.5 }
		},
	},
	shader,
	setup: ({gl, params, shaderProgram, inputNodeTexs }) => {
		const time = gl.getUniformLocation(shaderProgram, 'time');
		gl.uniform1f(time, params.time);
	},
});
