import { basicParamDefs, defineGpuFx } from '@/engine/fx-utils';
import bufferShaderSrc from './pixel-sort.buffer.glsl';
import renderShaderSrc from './pixel-sort.render.glsl';

let bufferShaderCache: WebGLProgram;
let renderShaderCache: WebGLProgram;

export default defineGpuFx({
	name: 'pixelSort',
	displayName: 'Pixel sort',
	category: 'glitch',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
		},
		threshold: {
			label: 'Threshold',
			type: 'range' as const,
			min: 0,
			max: 1,
			step: 0.01,
			default: { type: 'literal' as const, value: 0.5 }
		},
		direction: {
			label: 'Direction',
			type: 'enum' as const,
			options: [{
				label: 'V',
				value: 'v',
			}, {
				label: 'H',
				value: 'h',
			}],
			default: { type: 'literal' as const, value: 'h' }
		},
		sort: {
			label: 'Sort',
			type: 'enum' as const,
			options: [{
				label: 'A > B',
				value: 'ab',
			}, {
				label: 'B > A',
				value: 'ba',
			}],
			default: { type: 'literal' as const, value: 'ab' }
		},
		shadow: {
			label: 'Shadow',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: false }
		},
		trigger: {
			label: 'Trigger',
			type: 'enum' as const,
			options: [{
				label: 'Luminance',
				value: 'luminance',
			}, {
				label: 'Brightness',
				value: 'brightness',
			}, {
				label: 'Random',
				value: 'random',
			}],
			default: { type: 'literal' as const, value: 'luminance' }
		},
		seed: {
			label: 'Seed',
			type: 'seed' as const,
			default: { type: 'literal' as const, value: 0 },
			visibility: (state: any) => {
				return state.trigger.type === 'expression' || state.trigger.value === 'random';
			}
		},
	},
	main: ({ renderer, gl, resultFrameBuffer, width, height, params, inputNodeTexs }) => {
		const texA = renderer.createTexture();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texA);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
			gl.RGBA, gl.UNSIGNED_BYTE, null);	
		const fboForPre = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, fboForPre);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texA, 0);

		{
			const bufferShader = bufferShaderCache ?? renderer.initShaderProgram(`#version 300 es
				in vec2 position;
				out vec2 in_uv;

				void main() {
					in_uv = (position + 1.0) / 2.0;
					gl_Position = vec4(position, 0.0, 1.0);
				}
			`, bufferShaderSrc);

			if (bufferShaderCache == null) bufferShaderCache = bufferShader;
		
			gl.useProgram(bufferShader);

			const u_resolution = gl.getUniformLocation(bufferShader, 'u_resolution');
			gl.uniform2fv(u_resolution, [width, height]);

			const positionLocation = gl.getAttribLocation(bufferShader, 'position');
			gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(positionLocation);

			const threshold = gl.getUniformLocation(bufferShader, 'u_threshold');
			gl.uniform1f(threshold, params.shadow ? params.threshold : 1 - params.threshold);

			const vertical = gl.getUniformLocation(bufferShader, 'u_vertical');
			gl.uniform1f(vertical, params.direction === 'v' ? 1 : 0);

			const reverse = gl.getUniformLocation(bufferShader, 'u_reverse');
			gl.uniform1f(reverse, params.sort === 'ba' ? 1 : 0);

			const shadow = gl.getUniformLocation(bufferShader, 'u_shadow');
			gl.uniform1f(shadow, params.shadow);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.input);

			gl.drawArrays(gl.TRIANGLES, 0, 6);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.deleteFramebuffer(fboForPre);
		}

		const renderShader = renderShaderCache ?? renderer.initShaderProgram(`#version 300 es
			in vec2 position;
			out vec2 in_uv;

			void main() {
				in_uv = (position + 1.0) / 2.0;
				gl_Position = vec4(position, 0.0, 1.0);
			}
		`, renderShaderSrc);
		if (renderShaderCache == null) renderShaderCache = renderShader;

		gl.useProgram(renderShader);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.input);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, texA);

		const texturePreLocation = gl.getUniformLocation(renderShader, 'u_texture');
		const texturePostLocation = gl.getUniformLocation(renderShader, 'u_textureBuffer');
		gl.uniform1i(texturePreLocation, 0);
		gl.uniform1i(texturePostLocation, 1);

		const u_resolution = gl.getUniformLocation(renderShader, 'u_resolution');
		gl.uniform2fv(u_resolution, [width, height]);

		const positionLocation = gl.getAttribLocation(renderShader, 'position');
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(positionLocation);

		const threshold = gl.getUniformLocation(renderShader, 'u_threshold');
		gl.uniform1f(threshold, params.shadow ? params.threshold / 100 : 1 - (params.threshold / 100));

		const vertical = gl.getUniformLocation(renderShader, 'u_vertical');
		gl.uniform1f(vertical, params.direction === 'v' ? 1 : 0);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.input);

		gl.bindFramebuffer(gl.FRAMEBUFFER, resultFrameBuffer);

		gl.drawArrays(gl.TRIANGLES, 0, 6);

		gl.deleteTexture(texA);
	}
});
