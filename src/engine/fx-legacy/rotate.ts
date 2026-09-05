import { defineGpuFx } from '@/engine/fx-utils';

export default defineGpuFx({
	name: 'rotate',
	displayName: 'Rotate',
	category: 'utility',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
		},
		angle: {
			label: 'Angle',
			type: 'range' as const,
			min: -360,
			max: 360,
			default: { type: 'literal' as const, value: 90 }
		},
	},
	shader: `#version 300 es
		precision highp float;
			
		in vec2 in_uv;
		out vec4 out_color;
		uniform sampler2D u_texture;
		uniform vec2 u_resolution;
		uniform float angle;

		void main() {
			vec2 coord = in_uv;
			float sin_factor = sin(angle);
			float cos_factor = cos(angle);
			coord = vec2((coord.x - 0.5) * (u_resolution.x / u_resolution.y), coord.y - 0.5) * mat2(cos_factor, sin_factor, -sin_factor, cos_factor);
			coord += 0.5;
			out_color = texture(u_texture, coord);
		}
	`,
	setup: ({gl, params, shaderProgram, inputNodeTexs }) => {
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.input);
		const u_texture = gl.getUniformLocation(shaderProgram, 'u_texture');
		gl.uniform1i(u_texture, 0);

		const angle = gl.getUniformLocation(shaderProgram, 'angle');
		gl.uniform1f(angle, params.angle  * (Math.PI / 360));
	},
});
