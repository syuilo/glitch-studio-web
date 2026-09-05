import { defineGpuFx } from '@/engine/fx-utils';
import shader from './mask-blocks.glsl';

export default defineGpuFx({
	name: 'maskBlocks',
	displayName: 'MASK: Blocks',
	category: 'mask',
	paramDefs: {
		amount: {
			label: 'Amount',
			type: 'range' as const,
			max: 100,
			default: { type: 'literal' as const, value: 50 }
		},
		alphaRandomness: {
			label: 'Alpha randomness',
			type: 'range' as const,
			max: 100,
			default: { type: 'literal' as const, value: 100 }
		},
		sizeX: {
			label: 'Size X',
			type: 'range' as const,
			step: 0.01,
			max: 100,
			default: { type: 'literal' as const, value: 90 }
		},
		sizeY: {
			label: 'Size Y',
			type: 'range' as const,
			step: 0.01,
			max: 100,
			default: { type: 'literal' as const, value: 90 }
		},
		seed: {
			label: 'Seed',
			type: 'seed' as const,
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
		const amount = gl.getUniformLocation(shaderProgram, 'amount');
		gl.uniform1f(amount, params.amount / 100);
		const alphaRandomness = gl.getUniformLocation(shaderProgram, 'alphaRandomness');
		gl.uniform1f(alphaRandomness, params.alphaRandomness / 100);
	},
});
