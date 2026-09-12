import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'shift',
	displayName: 'Shift',
	category: 'utility',
	paramDefs: {
		input: { type: 'node', label: 'Input', dataType: 'color', primary: true },
		amount: { type: 'vector', min: -1, max: 1, step: 0.01, label: 'Amount' },
		wrap: {
			type: 'enum',
			label: 'Wrap',
			options: [
				{ label: 'Clamp to edge', value: 'clampToEdge' },
				{ label: 'Repeat', value: 'repeat' },
				{ label: 'Repeat (Mirrored)', value: 'repeatMirrored' },
			],
		},
	},
	getDefaultParams: () => ({
		amount: { type: 'literal', value: [0, 0] },
		wrap: { type: 'literal', value: 'repeatMirrored' },
	}),
	outputs: {
		output: { dataType: 'color' },
	},
});
