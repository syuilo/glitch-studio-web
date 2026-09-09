import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'quadtreeFilter',
	displayName: 'Quadtree filter',
	category: 'effect',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		threshold: { type: 'range', min: 0, max: 0.15, step: 0.00001, label: 'Thresold' },
		minDivisions: { type: 'range', min: 1, max: 64, step: 1, label: 'Min divisions' },
		maxIterations: { type: 'range', min: 1, max: 16, step: 1, label: 'Max iterations' },
		borderWidth: { type: 'range', min: 0, max: 1, step: 0.001, label: 'Border width' },
		borderAbsolute: { type: 'bool', label: 'Border absolute' },
	},
	getDefaultParams: () => ({
		threshold: { type: 'literal', value: 0.005 },
		minDivisions: { type: 'literal', value: 4 },
		maxIterations: { type: 'literal', value: 10 },
		borderWidth: { type: 'literal', value: 0 },
		borderAbsolute: { type: 'literal', value: false },
	}),
});
