import { defineGpuFx } from '@/engine/fx-utils';
import shader from './liquid-distort.glsl';

export default defineGpuFx({
	name: 'liquidDistort',
	displayName: 'Liquid Distort',
	category: 'effect',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
			default: { type: 'literal' as const, value: null }
		},
		volatility: {
			label: 'Volatility',
			type: 'range' as const,
			step: 0.01,
			max: 1,
			default: { type: 'literal' as const, value: 0.15 }
		},
		seed: {
			label: 'Seed',
			type: 'seed' as const,
		},
		time: {
			label: 'Time',
			type: 'range' as const,
			step: 0.01,
			max: 10,
			default: { type: 'literal' as const, value: 5, }
		},
		wrap: {
			label: 'Wrap',
			type: 'enum' as const,
			options: [{
				label: 'Clamp to edge',
				value: 'clampToEdge',
			}, {
				label: 'Repeat',
				value: 'repeat',
			}, {
				label: 'Repeat (Mirrored)',
				value: 'repeatMirrored',
			}],
			default: { type: 'literal' as const, value: 'repeatMirrored' }
		},
	},
	shader,
	setup: ({gl, params, shaderProgram, inputNodeTexs }) => {
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.input);
		const u_texture = gl.getUniformLocation(shaderProgram, 'u_texture');
		gl.uniform1i(u_texture, 0);

		switch (params.wrap) {
			case 'clampToEdge': {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				break;
			}

			case 'repeat': {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
				break;
			}

			case 'repeatMirrored': {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
				break;
			}
		}

		const seed = gl.getUniformLocation(shaderProgram, 'seed');
		gl.uniform1f(seed, params.seed);
		const volatility = gl.getUniformLocation(shaderProgram, 'volatility');
		gl.uniform1f(volatility, params.volatility);
		const time = gl.getUniformLocation(shaderProgram, 'time');
		gl.uniform1f(time, params.time);
	},
});
