import { defineGpuFx, basicParamDefs } from '@/engine/fx-utils';

export default defineGpuFx({
	name: 'ghost',
	displayName: 'Ghost',
	paramDefs: {
		amount: {
			label: 'Amount',
			type: 'range' as const,
			max: 100,
			default: { type: 'literal' as const, value: 50 }
		},
		leftSignal: {
			label: 'L signal',
			type: 'signal' as const,
			default: { type: 'literal' as const, value: [true, false, false] }
		},
		rightSignal: {
			label: 'R signal',
			type: 'signal' as const,
			default: { type: 'literal' as const, value: [false, false, true] }
		},
		

	},
	shader: `#version 300 es
		precision highp float;
		
		in vec2 in_uv;
		uniform sampler2D u_texture;
		uniform vec2 u_resolution;
		
		uniform float amount;
		
		void main() {
			//vec4 sample = texture(u_texture, in_uv);
			//vec4 left = texture(u_texture, vec2(in_uv.x + amount, in_uv.y));
			//vec4 right = texture(u_texture, vec2(in_uv.x - amount, in_uv.y));

			//float r = sample.r;
			//r = max(r, left.r);
			//r = max(r, right.r);
			//float g = sample.g;
			//g = max(g, left.g);
			//g = max(g, right.g);
			//float b = sample.b;
			//b = max(b, left.b);
			//b = max(b, right.b);
			
			//out_color = vec4(r, g, b, sample.a);
			out_color = vec4(1.0, 1.0, 0.0, 1.0);
		}
	`,
	setup: ({ gl, params, shaderProgram }) => {
		const amount = gl.getUniformLocation(shaderProgram, 'amount');
		gl.uniform1f(amount, params.amount / 100);
	},
});
