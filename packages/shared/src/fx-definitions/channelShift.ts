import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'channelShift',
	displayName: 'Channel Shift',
	category: 'glitch',
	paramDefs: {
		input: { type: 'node', label: 'Input', dataType: 'color', primary: true },
		amount: { type: 'vector', min: -1, max: 1, step: 0.01, label: 'Amount' },
		leftSignal: { type: 'signal', label: 'L signal' },
		rightSignal: { type: 'signal', label: 'R signal' },
		blendMode: { type: 'blendMode', label: 'Blend mode' },
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
		amount: { type: 'literal', value: [0.02, 0] },
		leftSignal: { type: 'literal', value: [true, false, false] },
		rightSignal: { type: 'literal', value: [false, false, true] },
		blendMode: { type: 'literal', value: 'lighten' },
		wrap: { type: 'literal', value: 'repeatMirrored' },
	}),
	outputs: {
		output: { dataType: 'color' },
	},
});
