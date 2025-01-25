import { defineGpuFx } from '@/engine/fx-utils';
import shader from './grayscale.glsl';

export default defineGpuFx({
	name: 'grayscale',
	displayName: 'Grayscale',
	category: 'color',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
			default: { type: 'literal' as const, value: null }
		},
		mode: {
			label: 'Mode',
			type: 'enum' as const,
			options: [{
				label: 'Luminance',
				value: 'luminance',
			}, {
				label: 'Brightness',
				value: 'brightness',
			}],
			default: { type: 'literal' as const, value: 'luminance' }
		},
	},
	shader,
	setup: ({gl, params, shaderProgram, inputNodeTexs }) => {
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.input);
		const u_texture = gl.getUniformLocation(shaderProgram, 'u_texture');
		gl.uniform1i(u_texture, 0);

		const u_luminance = gl.getUniformLocation(shaderProgram, 'u_luminance');
		gl.uniform1f(u_luminance, params.mode === 'luminance');
	},
});
