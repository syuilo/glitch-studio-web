import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'bloom',
	displayName: 'Bloom',
	category: 'effect',
	paramDefs: {
		input: { type: 'node', label: 'Input', dataType: 'color', primary: true },
		strength: { type: 'range', label: 'Strength', min: 0, max: 5, step: 0.01 },
		threshold: { type: 'range', label: 'Threshold', min: 0, max: 1, step: 0.01 },
		softKnee: { type: 'range', label: 'Soft knee', min: 0, max: 1, step: 0.01 },
		radius: { type: 'range', label: 'Radius', min: 0, max: 1, step: 0.01 },
	},
	getDefaultParams: () => ({
		strength: { type: 'literal', value: 1 },
		threshold: { type: 'literal', value: 0.7 },
		softKnee: { type: 'literal', value: 0.5 },
		radius: { type: 'literal', value: 0.7 },
	}),
	outputs: {
		output: { dataType: 'color' },
	},
});
