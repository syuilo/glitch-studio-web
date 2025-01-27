import { defineGpuFx } from '@/engine/fx-utils';
import shader from './mirror.glsl';

export default defineGpuFx({
	name: 'mirror',
	displayName: 'Mirror',
	category: 'utility',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
		},
		h: {
			label: 'Horizontal',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: true }
		},
		v: {
			label: 'Vertical',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: false }
		},
	},
	shader,
	setup: ({gl, params, shaderProgram, inputNodeTexs }) => {
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.input);
		const u_texture = gl.getUniformLocation(shaderProgram, 'u_texture');
		gl.uniform1i(u_texture, 0);

		const u_h = gl.getUniformLocation(shaderProgram, 'u_h');
		gl.uniform1i(u_h, params.h ? 1 : 0);

		const u_v = gl.getUniformLocation(shaderProgram, 'u_v');
		gl.uniform1i(u_v, params.v ? 1 : 0);
	},
});
