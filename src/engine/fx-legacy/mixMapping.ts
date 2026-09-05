import { basicParamDefs, defineGpuFx } from '@/engine/fx-utils';
import shaderSrc from './mixMapping.glsl';

let shaderCache: WebGLProgram;

export default defineGpuFx({
	name: 'mixMapping',
	displayName: 'Mix (Mapping)',
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
		mode: {
			label: 'Mode',
			type: 'blendMode' as const,
			default: { type: 'literal' as const, value: 'normal' }
		},
		map: {
			label: 'Map',
			type: 'node' as const,
			default: { type: 'literal' as const, value: null }
		},
		alphaMix: {
			label: 'Alpha mix',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: false }
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

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.map);
		const u_texture_map = gl.getUniformLocation(shader, 'u_texture_map');
		gl.uniform1i(u_texture_map, 2);

		const u_mode = gl.getUniformLocation(shader, 'u_mode');
		gl.uniform1i(u_mode,
			params.mode === 'normal' ? 0 :
			params.mode === 'add' ? 1 :
			params.mode === 'subtract' ? 2 :
			params.mode === 'multiply' ? 3 :
			params.mode === 'divide' ? 4 :
			params.mode === 'difference' ? 5 :
			params.mode === 'darken' ? 6 :
			params.mode === 'lighten' ? 7 :
			params.mode === 'screen' ? 8 :
			params.mode === 'overlay' ? 9 :
			params.mode === 'hardlight' ? 10 :
			params.mode === 'softlight' ? 11 :
			params.mode === 'dodge' ? 12 :
			params.mode === 'burn' ? 13 :
			params.mode === 'exclusion' ? 14 :
			params.mode === 'hue' ? 15 :
			params.mode === 'saturation' ? 16 :
			params.mode === 'color' ? 17 :
			params.mode === 'luminosity' ? 18 :
			0
		);

		const u_a_mix = gl.getUniformLocation(shader, 'u_a_mix');
		gl.uniform1f(u_a_mix, params.alphaMix);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}
});
