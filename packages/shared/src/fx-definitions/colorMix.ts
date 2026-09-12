import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'colorMix',
	displayName: 'Mix (Color)',
	category: 'utility',
	paramDefs: {
		inputA: { type: 'node', label: 'A', dataType: 'color', primary: true, default: () => ({ type: 'literal', value: null }) },
		inputB: { type: 'node', label: 'B', dataType: 'color', default: () => ({ type: 'literal', value: null }) },
		fitModeA: { type: 'enum', label: 'A fit mode', options: [{ label: 'Stretch', value: 'stretch' }, { label: 'Cover', value: 'cover' }, { label: 'Contain', value: 'contain' }], default: () => ({ type: 'literal', value: 'cover' }) },
		fitModeB: { type: 'enum', label: 'B fit mode', options: [{ label: 'Stretch', value: 'stretch' }, { label: 'Cover', value: 'cover' }, { label: 'Contain', value: 'contain' }], default: () => ({ type: 'literal', value: 'cover' }) },
		amount: { type: 'range', label: 'Amount', min: 0, max: 1, step: 0.01, canNode: true, default: () => ({ type: 'literal', value: 0.5 }) },
		fitModeAmount: { type: 'enum', label: 'Amount fit mode', options: [{ label: 'Stretch', value: 'stretch' }, { label: 'Cover', value: 'cover' }, { label: 'Contain', value: 'contain' }], default: () => ({ type: 'literal', value: 'stretch' }) },
	},
	outputs: {
		output: { dataType: 'color' },
	},
});
