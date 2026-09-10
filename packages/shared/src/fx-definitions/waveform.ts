import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'waveform',
	displayName: 'Waveform',
	category: 'effect',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		resolution: { type: 'enum', label: 'Resolution', options: [
			{ label: '1/1', value: 1 },
			{ label: '1/2', value: 2 },
			{ label: '1/4', value: 4 },
			{ label: '1/8', value: 8 },
			{ label: '1/16', value: 16 },
		] },
		mode: { type: 'enum', label: 'Mode', options: [
			{ label: 'RGB', value: 'rgb' },
			{ label: 'Luminance', value: 'luminance' },
		] },
		intensity: { type: 'range', label: 'Intensity', min: 0, max: 10, step: 0.01 },
	},
	getDefaultParams: () => ({
		resolution: { type: 'literal', value: 1 },
		mode: { type: 'literal', value: 'rgb' },
		intensity: { type: 'literal', value: 1 },
	}),
});
