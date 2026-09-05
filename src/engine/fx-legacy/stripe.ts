import { defineGpuFx } from '@/engine/fx-utils';
import shader from './stripe.glsl';

export default defineGpuFx({
	name: 'stripe',
	displayName: 'Stripe',
	category: 'draw',
	paramDefs: {
		frequency: {
			label: 'Frequency',
			type: 'range' as const,
			step: 0.01,
			max: 1000,
			default: { type: 'literal' as const, value: 100 }
		},
		angle: {
			label: 'Angle',
			type: 'range' as const,
			step: 0.01,
			max: 1,
			default: { type: 'literal' as const, value: 0.5 }
		},
		phase: {
			label: 'Phase',
			type: 'range' as const,
			step: 0.01,
			max: 1,
			default: { type: 'literal' as const, value: 0 }
		},
	},
	shader,
	setup: ({gl, params, shaderProgram }) => {
		const u_frequency = gl.getUniformLocation(shaderProgram, 'u_frequency');
		gl.uniform1f(u_frequency, params.frequency);
		const u_angle = gl.getUniformLocation(shaderProgram, 'u_angle');
		gl.uniform1f(u_angle, params.angle);
		const u_phase = gl.getUniformLocation(shaderProgram, 'u_phase');
		gl.uniform1f(u_phase, params.phase);
	},
});
