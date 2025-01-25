import { basicParamDefs, defineGpuFx } from '@/engine/fx-utils';
import shaderSrc from './flip.glsl';

let shaderCache: WebGLProgram;

export default defineGpuFx({
	name: 'flip',
	displayName: 'Flip',
	category: 'utility',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
			default: { type: 'literal' as const, value: null }
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
	main: ({ renderer, gl, resultFrameBuffer, width, height, params, inputNodeTexs }) => {
		const shader = shaderCache ?? renderer.initShaderProgram(`#version 300 es
			in vec2 position;
			uniform bool u_h;
			uniform bool u_v;
			out vec2 in_uv;

			void main() {
				in_uv = (position + 1.0) / 2.0;
				if (u_h) in_uv.x = 1.0 - in_uv.x;
				if (u_v) in_uv.y = 1.0 - in_uv.y;
				gl_Position = vec4(position, 0.0, 1.0);
			}
		`, shaderSrc);
		if (shaderCache == null) shaderCache = shader;

		gl.useProgram(shader);

		const u_resolution = gl.getUniformLocation(shader, 'u_resolution');
		gl.uniform2fv(u_resolution, [width, height]);

		const positionLocation = gl.getAttribLocation(shader, 'position');
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(positionLocation);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.input);
		const u_texture = gl.getUniformLocation(shader, 'u_texture');
		gl.uniform1i(u_texture, 0);

		const u_h = gl.getUniformLocation(shader, 'u_h');
		gl.uniform1i(u_h, params.h);

		const u_v = gl.getUniformLocation(shader, 'u_v');
		gl.uniform1i(u_v, params.v);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}
});
