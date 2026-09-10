import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'frameDifference',
	displayName: 'Frame difference',
	category: 'effect',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		mode: { type: 'enum', label: 'Mode', options: [
			{ label: 'RGB', value: 'rgb' },
			{ label: 'Luminance', value: 'luminance' },
		] },
		gain: { type: 'range', label: 'Gain', min: 0, max: 10, step: 0.01 },
		threshold: { type: 'range', label: 'Threshold', min: 0, max: 1, step: 0.001 },
	},
	getDefaultParams: () => ({
		mode: { type: 'literal', value: 'rgb' },
		gain: { type: 'literal', value: 1 },
		threshold: { type: 'literal', value: 0 },
	}),
});
