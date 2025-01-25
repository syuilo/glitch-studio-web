import { defineGpuFx } from '@/engine/fx-utils';
import shaderSrc from './node-grid.glsl';

let shaderCache: WebGLProgram;

export default defineGpuFx({
	name: 'nodeGrid',
	displayName: 'Node Grid',
	category: 'draw',
	paramDefs: {
		inputs: {
			label: 'Inputs',
			type: 'nodes' as const,
			default: { type: 'literal' as const, value: [] }
		},
		scaleMap: {
			label: 'Scale Map',
			type: 'node' as const,
			default: { type: 'literal' as const, value: null }
		},
		opacityMap: {
			label: 'Opacity Map',
			type: 'node' as const,
			default: { type: 'literal' as const, value: null }
		},
		selectMap: {
			label: 'Select Map',
			type: 'node' as const,
			default: { type: 'literal' as const, value: null }
		},
		divisions: {
			label: 'Divisions',
			type: 'range' as const,
			step: 0.01,
			min: 0,
			max: 128,
			default: { type: 'literal' as const, value: 8 }
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

		for (let i = 0; i < Math.min(inputNodeTexs.inputs.length, 5); i++) {
			const img = inputNodeTexs.inputs[i];
			
			gl.activeTexture(gl.TEXTURE0 + i);
			gl.bindTexture(gl.TEXTURE_2D, img);
			const u_texture = gl.getUniformLocation(shader, 'u_texture_' + i.toString());
			gl.uniform1i(u_texture, i);
		}

		gl.activeTexture(gl.TEXTURE5);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.scaleMap);
		const u_scale_map = gl.getUniformLocation(shader, 'u_scale_map');
		gl.uniform1i(u_scale_map, 5);

		gl.activeTexture(gl.TEXTURE6);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.opacityMap);
		const u_opacity_map = gl.getUniformLocation(shader, 'u_opacity_map');
		gl.uniform1i(u_opacity_map, 6);

		gl.activeTexture(gl.TEXTURE7);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.selectMap);
		const u_select_map = gl.getUniformLocation(shader, 'u_select_map');
		gl.uniform1i(u_select_map, 7);

		const u_divisions = gl.getUniformLocation(shader, 'u_divisions');
		gl.uniform1f(u_divisions, params.divisions);

		const u_inputs_count = gl.getUniformLocation(shader, 'u_inputs_count');
		gl.uniform1i(u_inputs_count, Math.min(inputNodeTexs.inputs.length, 5));

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}
});
