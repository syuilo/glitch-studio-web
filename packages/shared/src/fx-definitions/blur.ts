import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'blur',
	displayName: 'Blur',
	category: 'effect',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		amount: { type: 'range', label: 'Amount', min: 0, max: 1, step: 0.01, canNode: true },
		samples: { type: 'range', label: 'Samples', min: 4, max: 256, step: 1 },
	},
	getDefaultParams: () => ({
		amount: { type: 'literal', value: 0.25 },
		samples: { type: 'literal', value: 16 },
	}),
});
