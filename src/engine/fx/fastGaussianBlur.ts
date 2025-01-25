import { defineGpuFx } from '@/engine/fx-utils';
import seedrandom from 'seedrandom';
import shaderSrc from './fastGaussianBlur.glsl';

let shaderCache: WebGLProgram;

export default defineGpuFx({
	name: 'fastGaussianBlur',
	displayName: 'Gaussian Blur (fast)',
	category: 'effect',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
			default: { type: 'literal' as const, value: null }
		},
		size: {
			label: 'Size',
			type: 'range' as const,
			step: 0.01,
			max: 100,
			default: { type: 'literal' as const, value: 8 }
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
			out vec2 in_uv;

			void main() {
				in_uv = (position + 1.0) / 2.0;
				gl_Position = vec4(position, 0.0, 1.0);
			}
		`, shaderSrc);
		if (shaderCache == null) shaderCache = shader;

		gl.useProgram(shader);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.input);

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

		const texRead = renderer.createTexture();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texRead);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
			gl.RGBA, gl.UNSIGNED_BYTE, null);

		const texWrite = renderer.createTexture();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texWrite);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
			gl.RGBA, gl.UNSIGNED_BYTE, null);

		var fboA = gl.createFramebuffer();
		var fboB = gl.createFramebuffer();

		var iterations = params.size;
		var writeBuffer = fboA
		var readBuffer = fboB
		var writeTex = texWrite
		var readTex = texRead

		gl.bindFramebuffer(gl.FRAMEBUFFER, writeBuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texWrite, 0);

		gl.bindFramebuffer(gl.FRAMEBUFFER, readBuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texRead, 0);

		for (var i = 0; i < iterations; i++) {
			// we will approximate a larger blur by using
			// multiple iterations starting with a very wide radius
			var radius = (iterations - i - 1)

			// draw blurred in one direction
			gl.bindFramebuffer(gl.FRAMEBUFFER, writeBuffer);
			if (i === 0) {
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.input);
			} else {
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, readTex);
				//readBuffer.color[0].bind()
			}
			const u_flip = gl.getUniformLocation(shader, 'u_flip');
			gl.uniform1i(u_flip, 1);
			const u_direction = gl.getUniformLocation(shader, 'u_direction');
			gl.uniform2fv(u_direction, i % 2 === 0 ? [radius, 0] : [0, radius]);	
			gl.clearColor(0, 0, 0, 0)
			gl.clear(gl.COLOR_BUFFER_BIT)
			gl.drawArrays(gl.TRIANGLES, 0, 6);

			// swap buffers
			var t = writeBuffer
			writeBuffer = readBuffer
			readBuffer = t
			var x = writeTex
			writeTex = readTex
			readTex = x
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, resultFrameBuffer);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, writeTex);

		const u_resolution = gl.getUniformLocation(shader, 'u_resolution');
		gl.uniform2fv(u_resolution, [width, height]);

		const positionLocation = gl.getAttribLocation(shader, 'position');
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(positionLocation);

		gl.drawArrays(gl.TRIANGLES, 0, 6);

		gl.deleteTexture(texWrite);
		gl.deleteTexture(texRead);
		gl.deleteFramebuffer(writeBuffer);
		gl.deleteFramebuffer(readBuffer);
	},
});
