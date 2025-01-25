import { basicParamDefs, defineGpuFx } from '@/engine/fx-utils';
import shaderSrc from './lcd.glsl';

let shaderCache: WebGLProgram;

export default defineGpuFx({
	name: 'lcd',
	displayName: 'LCD',
	category: 'effect',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
			default: { type: 'literal' as const, value: null }
		},
		size: {
			label: 'Size',
			type: 'range' as const,
			step: 0.01,
			min: 0,
			max: 200,
			default: { type: 'literal' as const, value: 50 }
		},
		border: {
			label: 'Border',
			type: 'range' as const,
			step: 0.01,
			min: 0,
			max: 1,
			default: { type: 'literal' as const, value: 0.1 }
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
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.input);
		const u_texture = gl.getUniformLocation(shader, 'u_texture');
		gl.uniform1i(u_texture, 0);

		const u_size = gl.getUniformLocation(shader, 'u_size');
		gl.uniform1f(u_size, params.size);

		const u_border = gl.getUniformLocation(shader, 'u_border');
		gl.uniform1f(u_border, params.border);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}
});
