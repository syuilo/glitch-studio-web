import { basicParamDefs, defineGpuFx } from '@/engine/fx-utils';
import shaderSrc from './grid.glsl';

let shaderCache: WebGLProgram;

export default defineGpuFx({
	name: 'grid',
	displayName: 'Grid',
	category: 'draw',
	paramDefs: {
		color: {
			label: 'Color',
			type: 'color' as const,
			default: { type: 'literal' as const, value: [255, 255, 255] }
		},
		major_divisions: {
			label: 'Major Divisions',
			type: 'range' as const,
			min: 0,
			max: 128,
			default: { type: 'literal' as const, value: 16 }
		},
		major_thickness: {
			label: 'Major Thickness',
			type: 'range' as const,
			step: 0.01,
			min: 0,
			max: 1,
			default: { type: 'literal' as const, value: 0.025 }
		},
		major_opacity: {
			label: 'Major Opacity',
			type: 'range' as const,
			step: 0.01,
			min: 0,
			max: 1,
			default: { type: 'literal' as const, value: 0.5 }
		},
		minor_divisions: {
			label: 'Minor Divisions',
			type: 'range' as const,
			min: 0,
			max: 16,
			default: { type: 'literal' as const, value: 4 }
		},
		minor_thickness: {
			label: 'Minor Thickness',
			type: 'range' as const,
			step: 0.01,
			min: 0,
			max: 1,
			default: { type: 'literal' as const, value: 0.1 }
		},
		minor_opacity: {
			label: 'Minor Opacity',
			type: 'range' as const,
			step: 0.01,
			min: 0,
			max: 1,
			default: { type: 'literal' as const, value: 0.25 }
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

		const u_resolution = gl.getUniformLocation(shader, 'u_resolution');
		gl.uniform2fv(u_resolution, [width, height]);

		const positionLocation = gl.getAttribLocation(shader, 'position');
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(positionLocation);

		const color = gl.getUniformLocation(shader, 'u_color');
		gl.uniform3f(color, params.color[0] / 255, params.color[1] / 255, params.color[2] / 255);

		const u_major_divisions = gl.getUniformLocation(shader, 'u_major_divisions');
		gl.uniform1f(u_major_divisions, params.major_divisions);

		const u_major_thickness = gl.getUniformLocation(shader, 'u_major_thickness');
		gl.uniform1f(u_major_thickness, params.major_thickness);

		const u_major_opacity = gl.getUniformLocation(shader, 'u_major_opacity');
		gl.uniform1f(u_major_opacity, params.major_opacity);

		const u_minor_divisions = gl.getUniformLocation(shader, 'u_minor_divisions');
		gl.uniform1f(u_minor_divisions, params.minor_divisions + 1);

		const u_minor_thickness = gl.getUniformLocation(shader, 'u_minor_thickness');
		gl.uniform1f(u_minor_thickness, params.minor_thickness);

		const u_minor_opacity = gl.getUniformLocation(shader, 'u_minor_opacity');
		gl.uniform1f(u_minor_opacity, params.minor_opacity);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}
});
