import { basicParamDefs, defineGpuFx } from '@/engine/fx-utils';
import shaderSrc from './tiling.glsl';

let shaderCache: WebGLProgram;

export default defineGpuFx({
	name: 'tiling',
	displayName: 'Tiling',
	category: 'effect',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
			default: { type: 'literal' as const, value: null }
		},
		divisions: {
			label: 'Divisions',
			type: 'range' as const,
			step: 0.1,
			min: 1,
			max: 128,
			default: { type: 'literal' as const, value: 16 }
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

		const u_divisions = gl.getUniformLocation(shader, 'u_divisions');
		gl.uniform1f(u_divisions, params.divisions);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}
});
