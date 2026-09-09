import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'snoise',
	displayName: 'snoise',
	category: 'utility',
	paramDefs: {
		x: { type: 'range', min: -100, max: 100, step: 0.01, label: 'X' },
		y: { type: 'range', min: -100, max: 100, step: 0.01, label: 'Y' },
		time: { type: 'range', min: 0, max: 100, step: 0.01, label: 'Time' },
	},
	getDefaultParams: () => ({
		x: { type: 'literal', value: 1 },
		y: { type: 'literal', value: 1 },
		time: { type: 'expression', value: 'TIME' },
	}),
});
