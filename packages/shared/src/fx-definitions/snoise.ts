import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'snoise',
	displayName: 'snoise',
	category: 'utility',
	paramDefs: {
		x: { type: 'range', min: -100, max: 100, step: 0.01, label: 'X', default: () => ({ type: 'literal', value: 1 }) },
		y: { type: 'range', min: -100, max: 100, step: 0.01, label: 'Y', default: () => ({ type: 'literal', value: 1 }) },
		time: { type: 'range', min: 0, max: 100, step: 0.01, label: 'Time', default: () => ({ type: 'expression', expression: 'TIME' }) },
	},
	outputs: {
		output: { primary: true, dataType: 'scalar' },
	},
});
