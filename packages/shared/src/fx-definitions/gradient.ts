import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'gradient',
	displayName: 'Gradient',
	category: 'utility',
	paramDefs: {
		start: { type: 'range', min: -1, max: 1, step: 0.01, label: 'Start' },
		end: { type: 'range', min: -1, max: 1, step: 0.01, label: 'End' },
		angle: { type: 'range', min: -180, max: 180, step: 0.01, label: 'Angle' },
		interpolation: {
			type: 'enum', label: 'Interpolation',
			options: [
				{ value: 'linear', label: 'Linear' },
				{ value: 'easing', label: 'Easing' },
			],
		},
	},
	getDefaultParams: () => ({
		start: { type: 'literal', value: -1 },
		end: { type: 'literal', value: 1 },
		angle: { type: 'literal', value: 0 },
		interpolation: { type: 'literal', value: 'linear' },
	}),
	outputs: {
		output: { dataType: 'scalar' },
	},
});
