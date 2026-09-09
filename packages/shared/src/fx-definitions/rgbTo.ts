import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'rgbTo',
	displayName: 'RGB To',
	category: 'utility',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		mode: {
			label: 'Mode',
			type: 'enum',
			options: [{
				label: 'Intensity',
				value: 0,
			}, {
				label: 'Luminance',
				value: 1,
			}],
		},
	},
	getDefaultParams: () => ({
		mode: { type: 'literal', value: 0 },
	}),
});
