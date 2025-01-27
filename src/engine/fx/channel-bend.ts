import { defineGpuFx } from '@/engine/fx-utils';
import shader from './channel-bend.glsl';

export default defineGpuFx({
	name: 'channelBend',
	displayName: 'Channel bend',
	category: 'glitch',
	paramDefs: {
		input: {
			label: 'Input',
			type: 'node' as const,
			primary: true,
		},
		phase: {
			label: 'Phase',
			type: 'range' as const,
			max: 100,
			default: { type: 'literal' as const, value: 50 }
		},
		frequency: {
			label: 'Freq',
			type: 'range' as const,
			max: 1000,
			default: { type: 'literal' as const, value: 50 }
		},
		strength: {
			label: 'Strength',
			type: 'range' as const,
			max: 100,
			default: { type: 'literal' as const, value: 5 }
		},
		mix: {
			label: 'Mix',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: false }
		},
	},
	shader,
	setup: ({gl, params, shaderProgram, inputNodeTexs }) => {
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, inputNodeTexs.input);
		const u_texture = gl.getUniformLocation(shaderProgram, 'u_texture');
		gl.uniform1i(u_texture, 0);

		const phase = gl.getUniformLocation(shaderProgram, 'phase');
		gl.uniform1f(phase, params.phase / 10);
		const frequency = gl.getUniformLocation(shaderProgram, 'frequency');
		gl.uniform1f(frequency, params.frequency);
		const strength = gl.getUniformLocation(shaderProgram, 'strength');
		gl.uniform1f(strength, params.strength);
		const mix = gl.getUniformLocation(shaderProgram, 'mix');
		gl.uniform1f(mix, params.mix);
	},
});
