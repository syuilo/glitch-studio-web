import { defineGpuFx } from '@/engine/fx-utils';
import shader from './color-blocks.glsl';

export default defineGpuFx({
	name: 'colorBlocks',
	displayName: 'Color blocks',
	category: 'draw',
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
			step: 0.01,
			min: 0,
			max: 1,
			default: { type: 'literal' as const, value: 1 }
		},
		size: {
			label: 'Size',
			type: 'wh' as const,
			step: 0.01,
			max: 1,
			default: { type: 'literal' as const, value: [0.9, 0.9] }
		},
		seed: {
			label: 'Seed',
			type: 'seed' as const,
		},
		rgb: {
			label: 'RGB',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: true }
		},
		cmy: {
			label: 'CMY',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: true }
		},
		black: {
			label: 'Black',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: true }
		},
		white: {
			label: 'White',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: true }
		},
	},
	shader,
	setup: ({gl, params, shaderProgram }) => {
		const seed = gl.getUniformLocation(shaderProgram, 'seed');
		gl.uniform1f(seed, params.seed);
		const u_size = gl.getUniformLocation(shaderProgram, 'u_size');
		gl.uniform2f(u_size, params.size[0], params.size[1]);
		const amount = gl.getUniformLocation(shaderProgram, 'amount');
		gl.uniform1f(amount, params.amount / 100);
		const alphaRandomness = gl.getUniformLocation(shaderProgram, 'alphaRandomness');
		gl.uniform1f(alphaRandomness, params.alphaRandomness);

		const colors = [] as [number, number, number][];
	
		if (params.rgb) {
			colors.push([255, 0, 0]);
			colors.push([0, 255, 0]);
			colors.push([0, 0, 255]);
		}
	
		if (params.cmy) {
			colors.push([255, 255, 0]);
			colors.push([255, 0, 255]);
			colors.push([0, 255, 255]);
		}
	
		if (params.black) {
			colors.push([0, 0, 0]);
		}
	
		if (params.white) {
			colors.push([255, 255, 255]);
		}

		for (let i = 0; i < colors.length; i++) {
			const color = colors[i];
			
			const x = gl.getUniformLocation(shaderProgram, `colors[${i.toString()}]`);
			gl.uniform3f(x, color[0] / 255, color[1] / 255, color[2] / 255);
		}

		const colorsCount = gl.getUniformLocation(shaderProgram, 'colorsCount');
		gl.uniform1i(colorsCount, colors.length);
	},
});
