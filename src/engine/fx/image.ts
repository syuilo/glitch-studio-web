import { basicParamDefs, defineGpuFx } from '@/engine/fx-utils';
import shaderSrc from './image.glsl';

let shaderCache: WebGLProgram;

export default defineGpuFx({
	name: 'image',
	displayName: 'Image',
	category: '',
	paramDefs: {
		image: {
			label: 'Image',
			type: 'image' as const,
			default: { type: 'literal' as const, value: null }
		},
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
			default: { type: 'literal' as const, value: 0 }
		},
	},
	main: ({ renderer, gl, resultFrameBuffer, width, height, params }) => {
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

		const image = params.image ? renderer.assets.find(x => x.id === params.image) : null;
		const imageTex = (params.image ? renderer.assetTextures.get(params.image) : renderer.placeholderTexture) ?? renderer.placeholderTexture;

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, imageTex);

		const u_resolution = gl.getUniformLocation(shader, 'u_resolution');
		gl.uniform2fv(u_resolution, [width, height]);

		const u_texture_resolution = gl.getUniformLocation(shader, 'u_texture_resolution');
		gl.uniform2fv(u_texture_resolution, image && imageTex ? [image.width, image.height] : [width, height]);

		const u_size_mode = gl.getUniformLocation(shader, 'u_size_mode');
		gl.uniform1i(u_size_mode, params.sizeMode);

		const positionLocation = gl.getAttribLocation(shader, 'position');
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(positionLocation);

		gl.drawArrays(gl.TRIANGLES, 0, 6);

		gl.bindTexture(gl.TEXTURE_2D, null);
	}
});
