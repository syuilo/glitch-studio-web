import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'fill',
	displayName: 'Fill',
	category: 'utility',
	paramDefs: {
		color: { type: 'color', label: 'Color', default: () => ({ type: 'literal', value: [1, 1, 1, 1] }) },
	},
	outputs: {
		output: { dataType: 'color' },
	},
});
