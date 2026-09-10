import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'accumulate',
	displayName: 'Accumulate',
	category: 'utility',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		strength: { type: 'range', label: 'Strength', min: 0, max: 10, step: 0.01 },
		halfLife: { type: 'range', label: 'Half-life (ms, 0 = infinite)', min: 0, max: 10000, step: 1 },
		reset: { type: 'bool', label: 'Reset' },
	},
	getDefaultParams: () => ({
		strength: { type: 'literal', value: 1 },
		halfLife: { type: 'literal', value: 300 },
		reset: { type: 'literal', value: false },
	}),
});
