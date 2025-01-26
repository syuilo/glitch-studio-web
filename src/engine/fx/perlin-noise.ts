import { defineGpuFx } from '@/engine/fx-utils';
import shader from './perlin-noise.glsl';

export default defineGpuFx({
	name: 'perlinNoise',
	displayName: 'Perlin noise',
	category: 'draw',
	paramDefs: {
		time: {
			label: 'Time',
			type: 'range' as const,
			step: 0.01,
			max: 10,
			default: { type: 'literal' as const, value: 5, }
		},
		seed: {
			label: 'Seed',
			type: 'seed' as const,
		},
		scale: {
			label: 'Scale',
			type: 'wh' as const,
			step: 0.01,
			max: 200,
			default: { type: 'literal' as const, value: [10, 10] }
		},
		alpha: {
			label: 'Alpha',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: false }
		},
	},
	shader,
	setup: ({ gl, params, shaderProgram }) => {
		const u_time = gl.getUniformLocation(shaderProgram, 'u_time');
		gl.uniform1f(u_time, params.time);
		const u_seed = gl.getUniformLocation(shaderProgram, 'u_seed');
		gl.uniform1f(u_seed, params.seed);
		const u_scale = gl.getUniformLocation(shaderProgram, 'u_scale');
		gl.uniform2f(u_scale, params.scale[0], params.scale[1]);
		const u_alpha = gl.getUniformLocation(shaderProgram, 'u_alpha');
		gl.uniform1i(u_alpha, params.alpha ? 1 : 0);
	},
});
