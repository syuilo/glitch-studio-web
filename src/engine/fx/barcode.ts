import { defineGpuFx } from '@/engine/fx-utils';

export default defineGpuFx({
	name: 'barcode',
	displayName: 'Barcode',
	paramDefs: {
		amount: {
			label: 'Amount',
			type: 'range' as const,
			max: 100,
			default: { type: 'literal' as const, value: 50 }
		},
		sizeX: {
			label: 'Size X',
			type: 'range' as const,
			step: 0.01,
			max: 100,
			default: { type: 'literal' as const, value: 90 }
		},
		sizeY: {
			label: 'Size Y',
			type: 'range' as const,
			step: 0.01,
			max: 100,
			default: { type: 'literal' as const, value: 90 }
		},
		seed: {
			label: 'Seed',
			type: 'seed' as const,
		},
		rgb: {
			label: 'RGB',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: true }
		},
		cmy: {
			label: 'CMY',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: true }
		},
		black: {
			label: 'Black',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: true }
		},
		white: {
			label: 'White',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: true }
		},
	

	},
	shader: `#version 300 es
	precision highp float;

	float random(vec2 c){
		return fract(sin(dot(c.xy ,vec2(12.9898,78.233))) * 43758.5453);
	}
		
	in vec2 in_uv;
	uniform sampler2D u_texture;
	uniform vec2 u_resolution;
	out vec4 out_color;
	uniform float seed;
	uniform float amount;
	uniform float sizeX;
	uniform float sizeY;

	void main() {
		float y = (1.0 - sizeY) * round((in_uv.y - 0.5) / (1.0 - sizeY));
		float shiftAmount = random(vec2(y + seed + 1.0, y + seed + 1.0));
		vec4 shifted = texture(u_texture, vec2(in_uv.x + shiftAmount, y));
		vec4 pixel = texture(u_texture, in_uv);
		out_color = random(vec2(y + seed, y + seed)) < amount ? shifted : pixel;
	}
	`,
	setup: ({gl, params, shaderProgram }) => {
		const seed = gl.getUniformLocation(shaderProgram, 'seed');
		gl.uniform1f(seed, params.seed);
		const sizeX = gl.getUniformLocation(shaderProgram, 'sizeX');
		gl.uniform1f(sizeX, params.sizeX / 100);
		const sizeY = gl.getUniformLocation(shaderProgram, 'sizeY');
		gl.uniform1f(sizeY, params.sizeY / 100);
		const amount = gl.getUniformLocation(shaderProgram, 'amount');
		gl.uniform1f(amount, params.amount / 100);
	},
});
