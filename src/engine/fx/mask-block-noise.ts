import { defineGpuFx } from '@/engine/fx-utils';
import shader from './mask-block-noise.glsl';

export default defineGpuFx({
	name: 'maskBlockNoise',
	displayName: 'MASK: Block noise',
	category: 'mask',
	paramDefs: {
		seed: {
			label: 'Seed',
			type: 'seed' as const,
		},
		scale: {
			label: 'Scale',
			type: 'range' as const,
			max: 50000,
			default: { type: 'literal' as const, value: 10000 }
		},
		sizeX: {
			label: 'Size X',
			type: 'range' as const,
			max: 100,
			default: { type: 'literal' as const, value: 30 }
		},
		sizeY: {
			label: 'Size Y',
			type: 'range' as const,
			max: 100,
			default: { type: 'literal' as const, value: 30 }
		},
	},
	shader,
	setup: ({gl, params, shaderProgram }) => {
		const seed = gl.getUniformLocation(shaderProgram, 'seed');
		gl.uniform1f(seed, params.seed);
		const sizeX = gl.getUniformLocation(shaderProgram, 'sizeX');
		gl.uniform1f(sizeX, params.sizeX / 100);
		const sizeY = gl.getUniformLocation(shaderProgram, 'sizeY');
		gl.uniform1f(sizeY, params.sizeY / 100);
		const scale = gl.getUniformLocation(shaderProgram, 'scale');
		gl.uniform1f(scale, Math.pow(params.scale / 2000, 2));
	},
});
