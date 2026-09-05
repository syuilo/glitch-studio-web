import { basicParamDefs, defineGpuFx } from '@/engine/fx-utils';
import shaderSrc from './channel-change.glsl';

let shaderCache: WebGLProgram;

export default defineGpuFx({
	name: 'channelChange',
	displayName: 'Channel Change',
	category: 'color',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
		},
		rTo: {
			label: 'R to',
			type: 'enum' as const,
			options: [{
				label: 'R',
				value: 1,
			}, {
				label: 'G',
				value: 2,
			}, {
				label: 'B',
				value: 3,
			}, {
				label: 'A',
				value: 0,
			}, {
				label: 'None',
				value: -1,
			}],
			default: { type: 'literal' as const, value: 1 }
		},
		gTo: {
			label: 'G to',
			type: 'enum' as const,
			options: [{
				label: 'R',
				value: 1,
			}, {
				label: 'G',
				value: 2,
			}, {
				label: 'B',
				value: 3,
			}, {
				label: 'A',
				value: 0,
			}, {
				label: 'None',
				value: -1,
			}],
			default: { type: 'literal' as const, value: 2 }
		},
		bTo: {
			label: 'B to',
			type: 'enum' as const,
			options: [{
				label: 'R',
				value: 1,
			}, {
				label: 'G',
				value: 2,
			}, {
				label: 'B',
				value: 3,
			}, {
				label: 'A',
				value: 0,
			}, {
				label: 'None',
				value: -1,
			}],
			default: { type: 'literal' as const, value: 3 }
		},
		aTo: {
			label: 'A to',
			type: 'enum' as const,
			options: [{
				label: 'R',
				value: 1,
			}, {
				label: 'G',
				value: 2,
			}, {
				label: 'B',
				value: 3,
			}, {
				label: 'A',
				value: 0,
			}, {
				label: 'None',
				value: -1,
			}],
			default: { type: 'literal' as const, value: 0 }
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

		const u_r_to = gl.getUniformLocation(shader, 'u_r_to');
		gl.uniform1i(u_r_to, params.rTo);
		const u_g_to = gl.getUniformLocation(shader, 'u_g_to');
		gl.uniform1i(u_g_to, params.gTo);
		const u_b_to = gl.getUniformLocation(shader, 'u_b_to');
		gl.uniform1i(u_b_to, params.bTo);
		const u_a_to = gl.getUniformLocation(shader, 'u_a_to');
		gl.uniform1i(u_a_to, params.aTo);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}
});
