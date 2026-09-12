import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'video',
	displayName: 'Video',
	category: '',
	paramDefs: {
		player: {
			label: 'Player',
			type: 'player',
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
		player: { type: 'literal', value: null },
		sizeMode: { type: 'literal', value: 1 },
	}),
	outputs: {
		output: { dataType: 'color' },
	},
});
