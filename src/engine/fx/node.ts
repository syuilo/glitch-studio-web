import { defineGpuFx } from '@/engine/fx-utils';

let shaderCache: WebGLProgram;

export default defineGpuFx({
	name: 'node',
	displayName: 'Node',
	category: 'utility',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
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
		`, `#version 300 es
			precision highp float;
			
			in vec2 in_uv;
			out vec4 out_color;
			uniform sampler2D u_texture;
			
			void main() {
				out_color = texture(u_texture, in_uv);
			}
		`);
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

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}
});
