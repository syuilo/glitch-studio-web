import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'opticalFlow',
	displayName: 'Optical flow',
	category: 'effect',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		strength: { type: 'range', label: 'Strength', min: 0, max: 10, step: 0.01 },
		confidence: { type: 'range', label: 'Confidence threshold', min: 0, max: 0.01, step: 0.0001 },
		smoothing: { type: 'range', label: 'Smoothing', min: 0, max: 3, step: 0.1 },
	},
	getDefaultParams: () => ({
		strength: { type: 'literal', value: 1 },
		confidence: { type: 'literal', value: 0.0001 },
		smoothing: { type: 'literal', value: 1 },
	}),
});
