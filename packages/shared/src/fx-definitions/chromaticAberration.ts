import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'chromaticAberration',
	displayName: 'Chromatic Aberration',
	category: 'glitch',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		amount: { type: 'range', min: 0, max: 1, step: 0.01, label: 'Amount' },
		rStrength: { type: 'range', min: -10, max: 10, step: 0.01, label: 'R strength' },
		gStrength: { type: 'range', min: -10, max: 10, step: 0.01, label: 'G strength' },
		bStrength: { type: 'range', min: -10, max: 10, step: 0.01, label: 'B strength' },
		samples: { type: 'number', min: 1, max: 100, label: 'Samples' },
		start: { type: 'range', min: 0, max: 1, step: 0.01, label: 'Start' },
		vector: { type: 'vector', step: 0.01, min: -5, max: 5, label: 'Vector' },
		normalize: { type: 'bool', label: 'Normalize' },
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
		amount: { type: 'literal', value: 0.1 },
		rStrength: { type: 'literal', value: 1 },
		gStrength: { type: 'literal', value: 1.5 },
		bStrength: { type: 'literal', value: 2 },
		samples: { type: 'literal', value: 32 },
		start: { type: 'literal', value: 0 },
		vector: { type: 'literal', value: [0, 0] },
		normalize: { type: 'literal', value: false },
		wrap: { type: 'literal', value: 'repeatMirrored' },
	}),
});
