import { defineGpuFx } from '@/engine/fx-utils';
import shader from './blurMapping.glsl';

export default defineGpuFx({
	name: 'blurMapping',
	displayName: 'Blur (Mapping)',
	category: 'effect',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
		},
		map: {
			label: 'Map',
			type: 'node' as const,
			default: { type: 'literal' as const, value: null }
		},
		radius: {
			label: 'Radius',
			type: 'range' as const,
			step: 0.01,
			max: 100,
			default: { type: 'literal' as const, value: 8 }
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
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.map);
		const u_map = gl.getUniformLocation(shaderProgram, 'u_map');
		gl.uniform1i(u_map, 1);

		const u_radius = gl.getUniformLocation(shaderProgram, 'u_radius');
		gl.uniform1f(u_radius, params.radius);

		const u_h = gl.getUniformLocation(shaderProgram, 'u_h');
		gl.uniform1i(u_h, params.h);

		const u_v = gl.getUniformLocation(shaderProgram, 'u_v');
		gl.uniform1i(u_v, params.v);
	},
});
