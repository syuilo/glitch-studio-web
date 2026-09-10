import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'tearings',
	displayName: 'Tearings',
	category: 'glitch',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		amount: { type: 'range', min: 0, max: 100, label: 'Amount' },
		strength: { type: 'range', min: -1, max: 1, step: 0.01, label: 'Strength' },
		size: { type: 'range', min: 0, max: 100, step: 0.01, label: 'Size' },
		angle: { type: 'range', min: -180, max: 180, step: 0.01, label: 'Angle' },
		channelShift: { type: 'range', min: 0, max: 10, step: 0.01, label: 'Ch shift' },
		seed: { type: 'seed', label: 'Seed' },
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
		amount: { type: 'literal', value: 3 },
		strength: { type: 'literal', value: 0.02 },
		size: { type: 'literal', value: 20 },
		angle: { type: 'literal', value: 0 },
		channelShift: { type: 'literal', value: 0.5 },
		seed: { type: 'expression', expression: 'TIME' },
		wrap: { type: 'literal', value: 'repeatMirrored' },
	}),
});
