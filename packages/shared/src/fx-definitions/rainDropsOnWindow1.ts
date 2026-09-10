import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'rainDropsOnWindow1',
	displayName: 'Rain Drops On Window (Type 1)',
	category: 'effect',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		density: { type: 'range', min: 0, max: 1, step: 0.01, label: 'Density' },
		refraction: { type: 'range', min: 0, max: 2, step: 0.01, label: 'Refraction' },
		fog: { type: 'range', min: 0, max: 1, step: 0.01, label: 'Fog' },
		time: { type: 'number', step: 0.01, label: 'Time (s)' },
		scale: { type: 'range', min: 0.1, max: 5, step: 0.01, label: 'Scale' },
		seed: { type: 'seed', label: 'Seed' },
	},
	getDefaultParams: () => ({
		density: { type: 'literal', value: 0.6 },
		refraction: { type: 'literal', value: 0.8 },
		fog: { type: 'literal', value: 0.35 },
		time: { type: 'expression', expression: 'TIME' },
		scale: { type: 'literal', value: 1 },
		seed: { type: 'literal', value: 0 },
	}),
});
