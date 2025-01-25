import { basicParamDefs, defineGpuFx } from '@/engine/fx-utils';
import shaderSrc from './webcamera.glsl';

let shaderCache: WebGLProgram;

export default defineGpuFx({
	name: 'webcamera',
	displayName: 'Web Camera',
	category: '',
	paramDefs: {
		sizeMode: {
			label: 'Size mode',
			type: 'enum' as const,
			options: [{
				label: 'Stretch',
				value: 0,
			}, {
				label: 'Contain',
				value: 1,
			}, {
				label: 'Cover',
				value: 2,
			}],
			default: { type: 'literal' as const, value: 2 }
		},
		flipH: {
			label: 'Flip horizontal',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: false }
		},
	},
	main: ({ renderer, gl, resultFrameBuffer, width, height, params }) => {
		const shader = shaderCache ?? renderer.initShaderProgram(`#version 300 es
			in vec2 position;
			uniform bool u_flip_h;
			out vec2 in_uv;

			void main() {
				in_uv = (position + 1.0) / 2.0;
				if (u_flip_h) in_uv.x = 1.0 - in_uv.x;
				gl_Position = vec4(position, 0.0, 1.0);
			}
		`, shaderSrc);
		if (shaderCache == null) shaderCache = shader;

		gl.useProgram(shader);

		const imageTex = renderer.webcameraTexture;

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, imageTex);

		const u_resolution = gl.getUniformLocation(shader, 'u_resolution');
		gl.uniform2fv(u_resolution, [width, height]);

		const u_texture_resolution = gl.getUniformLocation(shader, 'u_texture_resolution');
		gl.uniform2fv(u_texture_resolution, [renderer.webcameraWidth, renderer.webcameraHeight]);

		const u_flip_h = gl.getUniformLocation(shader, 'u_flip_h');
		gl.uniform1i(u_flip_h, params.flipH);

		const u_size_mode = gl.getUniformLocation(shader, 'u_size_mode');
		gl.uniform1i(u_size_mode, params.sizeMode);

		const positionLocation = gl.getAttribLocation(shader, 'position');
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(positionLocation);

		gl.drawArrays(gl.TRIANGLES, 0, 6);

		gl.bindTexture(gl.TEXTURE_2D, null);
	}
});
