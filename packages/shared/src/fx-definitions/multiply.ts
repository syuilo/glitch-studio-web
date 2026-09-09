import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'multiply',
	displayName: 'multiply',
	category: 'utility',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		v: { type: 'range', min: -10, max: 10, step: 0.01, label: 'Value' },
	},
	getDefaultParams: () => ({
		v: { type: 'literal', value: 2 },
	}),
});
