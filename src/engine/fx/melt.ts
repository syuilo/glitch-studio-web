import { defineGpuFx, basicParamDefs } from '@/engine/fx-utils';
import shader from './melt.glsl';

export default defineGpuFx({
	name: 'melt',
	displayName: 'Melt',
	category: 'glitch',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
			default: { type: 'literal' as const, value: null }
		},
		amount: {
			label: 'Amount',
			type: 'range' as const,
			step: 0.01,
			max: 1,
			default: { type: 'literal' as const, value: 0.5 }
		},
		leftSignal: {
			label: 'L signal',
			type: 'signal' as const,
			default: { type: 'literal' as const, value: [true, false, false] }
		},
		rightSignal: {
			label: 'R signal',
			type: 'signal' as const,
			default: { type: 'literal' as const, value: [false, false, true] }
		},
		blendMode: {
			label: 'Blend mode',
			type: 'blendMode' as const,
			default: { type: 'literal' as const, value: 'lighten' }
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

		const amount = gl.getUniformLocation(shaderProgram, 'amount');
		gl.uniform1f(amount, params.amount);
		const leftR = gl.getUniformLocation(shaderProgram, 'leftR');
		gl.uniform1f(leftR, params.leftSignal[0]);
		const rightR = gl.getUniformLocation(shaderProgram, 'rightR');
		gl.uniform1f(rightR, params.rightSignal[0]);
		const leftG = gl.getUniformLocation(shaderProgram, 'leftG');
		gl.uniform1f(leftG, params.leftSignal[1]);
		const rightG = gl.getUniformLocation(shaderProgram, 'rightG');
		gl.uniform1f(rightG, params.rightSignal[1]);
		const leftB = gl.getUniformLocation(shaderProgram, 'leftB');
		gl.uniform1f(leftB, params.leftSignal[2]);
		const rightB = gl.getUniformLocation(shaderProgram, 'rightB');
		gl.uniform1f(rightB, params.rightSignal[2]);

		const u_blend_mode = gl.getUniformLocation(shaderProgram, 'u_blend_mode');
		gl.uniform1i(u_blend_mode,
			params.blendMode === 'normal' ? 0 :
			params.blendMode === 'add' ? 1 :
			params.blendMode === 'subtract' ? 2 :
			params.blendMode === 'multiply' ? 3 :
			params.blendMode === 'divide' ? 4 :
			params.blendMode === 'difference' ? 5 :
			params.blendMode === 'darken' ? 6 :
			params.blendMode === 'lighten' ? 7 :
			params.blendMode === 'screen' ? 8 :
			params.blendMode === 'overlay' ? 9 :
			params.blendMode === 'hardlight' ? 10 :
			params.blendMode === 'softlight' ? 11 :
			params.blendMode === 'dodge' ? 12 :
			params.blendMode === 'burn' ? 13 :
			params.blendMode === 'exclusion' ? 14 :
			params.blendMode === 'hue' ? 15 :
			params.blendMode === 'saturation' ? 16 :
			params.blendMode === 'color' ? 17 :
			params.blendMode === 'luminosity' ? 18 :
			0
		);
	},
});
