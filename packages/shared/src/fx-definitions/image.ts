import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'image',
	displayName: 'Image',
	category: '',
	paramDefs: {
		image: {
			label: 'Image',
			type: 'image',
		},
		sizeMode: {
			label: 'Size mode',
			type: 'enum',
			options: [{
				label: 'Stretch',
				value: 0,
			}, {
				label: 'Cover',
				value: 1,
			}, {
				label: 'Contain',
				value: 2,
			}],
		},
	},
	getDefaultParams: () => ({
		image: { type: 'literal', value: null },
		sizeMode: { type: 'literal', value: 1 },
	}),
});
