import { basicParamDefs, defineGpuFx } from '@/engine/fx-utils';
import shaderSrc from './add.glsl';

let shaderCache: WebGLProgram;

export default defineGpuFx({
	name: 'add',
	displayName: 'Add',
	category: 'color',
	paramDefs: {
		a: {
			label: 'A',
			type: 'node' as const,
			primary: true,
		},
		b: {
			label: 'B',
			type: 'node' as const,
			default: { type: 'literal' as const, value: null }
		},
	},
	main: ({ renderer, gl, resultFrameBuffer, width, height, params, inputNodeTexs }) => {
		const shader = shaderCache ?? renderer.initShaderProgram(`#version 300 es
			in vec2 position;
			out vec2 in_uv;

			void main() {
				in_uv = (position + 1.0) / 2.0;
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
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.a);
		const u_texture_a = gl.getUniformLocation(shader, 'u_texture_a');
		gl.uniform1i(u_texture_a, 0);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.b);
		const u_texture_b = gl.getUniformLocation(shader, 'u_texture_b');
		gl.uniform1i(u_texture_b, 1);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}
});
