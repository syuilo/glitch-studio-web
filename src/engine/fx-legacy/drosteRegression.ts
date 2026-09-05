import { defineGpuFx, basicParamDefs } from '@/engine/fx-utils';
import shader from './drosteRegression.glsl';

export default defineGpuFx({
	name: 'drosteRegression',
	displayName: 'Droste Regression',
	category: 'effect',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
		},
		amount: {
			label: 'Amount',
			type: 'range' as const,
			step: 0.01,
			max: 32,
			default: { type: 'literal' as const, value: 0.5 }
		},
		twist: {
			label: 'Twist',
			type: 'range' as const,
			step: 0.001,
			min: 0.04,
			max: 8,
			default: { type: 'literal' as const, value: 2 }
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
	setup: ({ gl, params, shaderProgram, inputNodeTexs }) => {
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

		const u_amount = gl.getUniformLocation(shaderProgram, 'u_amount');
		gl.uniform1f(u_amount, params.amount);
		const u_twist = gl.getUniformLocation(shaderProgram, 'u_twist');
		gl.uniform1f(u_twist, params.twist);
	},
});
