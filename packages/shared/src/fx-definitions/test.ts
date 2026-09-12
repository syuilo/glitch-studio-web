import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'test',
	displayName: 'test',
	category: 'utility',
	paramDefs: {
		x: { type: 'range', min: -1, max: 1, step: 0.01, label: 'X' },
		y: { type: 'range', min: -1, max: 1, step: 0.01, label: 'Y' },
	},
	getDefaultParams: () => ({
		x: { type: 'literal', value: 0 },
		y: { type: 'literal', value: 0 },
	}),
	outputs: {
		output: { dataType: 'color' },
	},
});
