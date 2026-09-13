import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'channelShift',
	displayName: 'Channel Shift',
	category: 'glitch',
	paramDefs: {
		input: { type: 'node', label: 'Input', dataType: 'color', primary: true, default: () => ({ type: 'literal', value: null }) },
		amount: { type: 'vector', min: -1, max: 1, step: 0.01, label: 'Amount', default: () => ({ type: 'literal', value: [0.02, 0] }) },
		leftSignal: { type: 'signal', label: 'L signal', default: () => ({ type: 'literal', value: [true, false, false] }) },
		rightSignal: { type: 'signal', label: 'R signal', default: () => ({ type: 'literal', value: [false, false, true] }) },
		blendMode: { type: 'blendMode', label: 'Blend mode', default: () => ({ type: 'literal', value: 'lighten' }) },
		wrap: {
			type: 'enum',
			label: 'Wrap',
			options: [
				{ label: 'Clamp to edge', value: 'clampToEdge' },
				{ label: 'Repeat', value: 'repeat' },
				{ label: 'Repeat (Mirrored)', value: 'repeatMirrored' },
			],
			default: () => ({ type: 'literal', value: 'repeatMirrored' }),
		},
	},
	outputs: {
		output: { primary: true, dataType: 'color' },
	},
});
