import { defineGpuFx } from '@/engine/fx-utils';
import shader from './bitStreamer.glsl';

export default defineGpuFx({
	name: 'bitStreamer',
	displayName: 'Bit Streamer',
	category: 'draw',
	paramDefs: {
		time: {
			label: 'Time',
			type: 'time' as const,
		},
		size: {
			label: 'Size',
			type: 'wh' as const,
			step: 0.01,
			max: 1,
			default: { type: 'literal' as const, value: [0.05, 0.05] }
		},
		space: {
			label: 'Space',
			type: 'range' as const,
			step: 0.01,
			max: 1,
			default: { type: 'literal' as const, value: 0.5 }
		},
		density: {
			label: 'Density',
			type: 'range' as const,
			step: 0.01,
			max: 1,
			default: { type: 'literal' as const, value: 0.5 }
		},
		seed1: {
			label: 'Seed 1',
			type: 'range' as const,
			max: 100,
			default: { type: 'literal' as const, value: 50, }
		},
		seed2: {
			label: 'Seed 2',
			type: 'range' as const,
			max: 100,
			default: { type: 'literal' as const, value: 50, }
		},
		seed3: {
			label: 'Seed 3',
			type: 'range' as const,
			max: 100,
			default: { type: 'literal' as const, value: 50, }
		},
	},
	shader,
	setup: ({gl, params, shaderProgram }) => {
		const u_time = gl.getUniformLocation(shaderProgram, 'u_time');
		gl.uniform1f(u_time, params.time);
		const u_size = gl.getUniformLocation(shaderProgram, 'u_size');
		gl.uniform2f(u_size, params.size[0], params.size[1]);
		const u_space = gl.getUniformLocation(shaderProgram, 'u_space');
		gl.uniform1f(u_space, params.space);
		const u_density = gl.getUniformLocation(shaderProgram, 'u_density');
		gl.uniform1f(u_density, params.density);
		const u_seed1 = gl.getUniformLocation(shaderProgram, 'u_seed1');
		gl.uniform1f(u_seed1, params.seed1);
		const u_seed2 = gl.getUniformLocation(shaderProgram, 'u_seed2');
		gl.uniform1f(u_seed2, params.seed2);
		const u_seed3 = gl.getUniformLocation(shaderProgram, 'u_seed3');
		gl.uniform1f(u_seed3, params.seed3);
	},
});
