import { defineGpuFx } from '@/engine/fx-utils';

let shaderCache: WebGLProgram;

export default defineGpuFx({
	name: 'shift',
	displayName: 'Shift',
	category: 'utility',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
			default: { type: 'literal' as const, value: null }
		},
		x: {
			label: 'X',
			type: 'range' as const,
			step: 0.01,
			min: -1,
			max: 1,
			default: { type: 'literal' as const, value: 0.5 }
		},
		y: {
			label: 'Y',
			type: 'range' as const,
			step: 0.01,
			min: -1,
			max: 1,
			default: { type: 'literal' as const, value: 0.5 }
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
	main: ({ renderer, gl, resultFrameBuffer, width, height, params, inputNodeTexs }) => {
		const shader = shaderCache ?? renderer.initShaderProgram(`#version 300 es
			in vec2 position;
			uniform vec2 u_pos;
			out vec2 in_uv;

			void main() {
				in_uv = ((position + 1.0) / 2.0) - u_pos;
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
	
		switch (params.wrap) {
			case 'clampToEdge': {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				break;
			}

			case 'repeat': {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
				break;
			}

			case 'repeatMirrored': {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
				break;
			}
		}

		const u_pos = gl.getUniformLocation(shader, 'u_pos');
		gl.uniform2f(u_pos, params.x, params.y);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	},
});
