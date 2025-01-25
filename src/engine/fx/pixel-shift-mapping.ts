import { basicParamDefs, defineGpuFx } from '@/engine/fx-utils';
import shaderSrc from './pixel-shift-mapping.glsl';

let shaderCache: WebGLProgram;

export default defineGpuFx({
	name: 'pixelShiftMapping',
	displayName: 'Pixel Shift Mapping',
	category: 'glitch',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
			default: { type: 'literal' as const, value: null }
		},
		map: {
			label: 'Map',
			type: 'node' as const,
			default: { type: 'literal' as const, value: null }
		},
		divisions: {
			label: 'Divisions',
			type: 'range' as const,
			min: 0,
			max: 128,
			default: { type: 'literal' as const, value: 4 }
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

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.map);
		const u_map = gl.getUniformLocation(shader, 'u_map');
		gl.uniform1i(u_map, 1);

		const u_divisions = gl.getUniformLocation(shader, 'u_divisions');
		gl.uniform1f(u_divisions, params.divisions);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}
});
