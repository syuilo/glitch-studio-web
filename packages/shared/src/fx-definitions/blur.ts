import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'blur',
	displayName: 'Blur',
	category: 'effect',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		amount: { type: 'node', label: 'Amount' },
		samples: { type: 'range', label: 'Samples', min: 4, max: 256, step: 1 },
	},
	getDefaultParams: () => ({
		amount: { type: 'literal', value: null },
		samples: { type: 'literal', value: 16 },
	}),
});
