import { defineGpuFx } from '@/engine/fx-utils';
import seedrandom from 'seedrandom';
import shaderSrc from './tearings.glsl';

let shaderCache: WebGLProgram;

export default defineGpuFx({
	name: 'tearings',
	displayName: 'Tearings',
	category: 'glitch',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
		},
		amount: {
			label: 'Amount',
			type: 'range' as const,
			max: 100,
			default: { type: 'literal' as const, value: 3 }
		},
		strength: {
			label: 'Strength',
			type: 'range' as const,
			step: 0.01,
			min: -100,
			max: 100,
			default: { type: 'literal' as const, value: 5 }
		},
		size: {
			label: 'Size',
			type: 'range' as const,
			step: 0.01,
			max: 100,
			default: { type: 'literal' as const, value: 20 }
		},
		channelShift: {
			label: 'Ch shift',
			type: 'range' as const,
			step: 0.01,
			max: 10,
			default: { type: 'literal' as const, value: 0.5 }
		},
		seed: {
			label: 'Seed',
			type: 'seed' as const,
			default: { type: 'expression' as const, value: 'TIME' }
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
			default: { type: 'literal' as const, value: 'repeatMirrored' }
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

		const amount = gl.getUniformLocation(shader, 'amount');
		gl.uniform1i(amount, params.amount);

		const channelShift = gl.getUniformLocation(shader, 'channelShift');
		gl.uniform1f(channelShift, params.channelShift);

		const rnd = seedrandom(params.seed.toString());

		for (let i = 0; i < params.amount; i++) {
			const o = gl.getUniformLocation(shader, `shiftOrigins[${i.toString()}]`);
			gl.uniform1f(o, rnd());

			const s = gl.getUniformLocation(shader, `shiftStrengths[${i.toString()}]`);
			gl.uniform1f(s, (1 - (rnd() * 2)) * (params.strength / 100));

			const h = gl.getUniformLocation(shader, `shiftHeights[${i.toString()}]`);
			gl.uniform1f(h, rnd() * (params.size / 100));
		}

		const u_resolution = gl.getUniformLocation(shader, 'u_resolution');
		gl.uniform2fv(u_resolution, [width, height]);

		const positionLocation = gl.getAttribLocation(shader, 'position');
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(positionLocation);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	},
});
