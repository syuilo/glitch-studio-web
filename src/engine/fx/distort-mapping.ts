import { defineGpuFx } from '@/engine/fx-utils';
import shader from './distort-mapping.glsl';

export default defineGpuFx({
	name: 'distortMapping',
	displayName: 'Distort (Mapping)',
	category: 'effect',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
		},
		xMap: {
			label: 'X Map',
			type: 'node' as const,
			default: { type: 'literal' as const, value: null }
		},
		yMap: {
			label: 'Y Map',
			type: 'node' as const,
			default: { type: 'literal' as const, value: null }
		},
		volatility: {
			label: 'Volatility',
			type: 'range' as const,
			step: 0.01,
			max: 1,
			default: { type: 'literal' as const, value: 0.15 }
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

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.xMap);
		const u_x_map = gl.getUniformLocation(shaderProgram, 'u_x_map');
		gl.uniform1i(u_x_map, 1);

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.yMap);
		const u_y_map = gl.getUniformLocation(shaderProgram, 'u_y_map');
		gl.uniform1i(u_y_map, 2);

		const volatility = gl.getUniformLocation(shaderProgram, 'volatility');
		gl.uniform1f(volatility, params.volatility);
	},
});
