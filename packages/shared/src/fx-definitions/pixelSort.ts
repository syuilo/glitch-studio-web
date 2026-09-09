import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'pixelSort',
	displayName: 'Pixel sort',
	category: 'glitch',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		threshold: { type: 'range', label: 'Threshold', min: 0, max: 1, step: 0.001 },
		shadow: { type: 'bool', label: 'Shadow' },
		direction: { type: 'enum', label: 'Direction', options: [
			{ label: 'Horizontal', value: 'horizontal' },
			{ label: 'Vertical', value: 'vertical' },
		] },
		order: { type: 'enum', label: 'Order', options: [
			{ label: 'A > B', value: 'descending' },
			{ label: 'B > A', value: 'ascending' },
		] },
	},
	getDefaultParams: () => ({
		threshold: { type: 'literal', value: 0.5 },
		shadow: { type: 'literal', value: false },
		direction: { type: 'literal', value: 'horizontal' },
		order: { type: 'literal', value: 'descending' },
	}),
});
