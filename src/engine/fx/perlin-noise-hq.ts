import { defineGpuFx } from '@/engine/fx-utils';
import shader from './perlin-noise-hq.glsl';

export default defineGpuFx({
	name: 'perlinNoiseHq',
	displayName: 'Perlin noise (High quality)',
	category: 'draw',
	paramDefs: {
		seed: {
			label: 'Seed',
			type: 'seed' as const,
		},
		scaleX: {
			label: 'Scale X',
			type: 'range' as const,
			max: 10000,
			default: { type: 'literal' as const, value: 1000 }
		},
		scaleY: {
			label: 'Scale Y',
			type: 'range' as const,
			max: 10000,
			default: { type: 'literal' as const, value: 1000 }
		},
	},
	shader,
	setup: ({gl, params, shaderProgram }) => {
		const seed = gl.getUniformLocation(shaderProgram, 'u_seed');
		gl.uniform1f(seed, params.seed);
		const scaleX = gl.getUniformLocation(shaderProgram, 'u_scaleX');
		gl.uniform1f(scaleX, params.scaleX);
		const scaleY = gl.getUniformLocation(shaderProgram, 'u_scaleY');
		gl.uniform1f(scaleY, params.scaleY);
	},
});
