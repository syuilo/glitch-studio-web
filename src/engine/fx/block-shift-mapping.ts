import { defineGpuFx } from '@/engine/fx-utils';
import shader from './block-shift-mapping.glsl';

export default defineGpuFx({
	name: 'blockShiftMapping',
	displayName: 'Block shift (Mapping)',
	category: 'glitch',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
		},
		shiftMap: {
			label: 'Shift Map',
			type: 'node' as const,
			default: { type: 'literal' as const, value: null }
		},
		shiftX: {
			label: 'Shift X',
			type: 'range' as const,
			step: 0.01,
			max: 1,
			default: { type: 'literal' as const, value: 0.2 }
		},
		shiftY: {
			label: 'Shift Y',
			type: 'range' as const,
			step: 0.01,
			max: 1,
			default: { type: 'literal' as const, value: 0.2 }
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
			default: { type: 'literal' as const, value: 'clampToEdge' }
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

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.shiftMap);
		const u_shift_map = gl.getUniformLocation(shaderProgram, 'u_shift_map');
		gl.uniform1i(u_shift_map, 1);

		const seed = gl.getUniformLocation(shaderProgram, 'seed');
		gl.uniform1f(seed, params.seed);
		const u_size = gl.getUniformLocation(shaderProgram, 'u_size');
		gl.uniform2f(u_size, params.size[0], params.size[1]);
		const shiftX = gl.getUniformLocation(shaderProgram, 'shiftX');
		gl.uniform1f(shiftX, params.shiftX);
		const shiftY = gl.getUniformLocation(shaderProgram, 'shiftY');
		gl.uniform1f(shiftY, params.shiftY);
	},
});
