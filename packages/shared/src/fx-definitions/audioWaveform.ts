import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'audioWaveform',
	displayName: 'Audio Waveform',
	category: 'draw',
	paramDefs: {
		player: { type: 'player', label: 'Player' },
		channel: { type: 'enum', label: 'Channel', options: [
			{ label: 'Left', value: 'left' }, { label: 'Right', value: 'right' },
			{ label: 'Mix (L + R)', value: 'mix' }, { label: 'Stereo', value: 'stereo' },
		] },
		duration: { type: 'range', label: 'Time span (seconds)', min: 0.005, max: 1, step: 0.005 },
		amplitude: { type: 'range', label: 'Amplitude', min: 0, max: 10, step: 0.01 },
		lineWidth: { type: 'range', label: 'Line width', min: 0.001, max: 0.05, step: 0.001 },
		color: { type: 'color', label: 'Color (L)' },
		rightColor: { type: 'color', label: 'Color (R)' },
	},
	getDefaultParams: () => ({
		player: { type: 'literal', value: null },
		channel: { type: 'literal', value: 'stereo' },
		duration: { type: 'literal', value: 0.05 },
		amplitude: { type: 'literal', value: 1 },
		lineWidth: { type: 'literal', value: 0.003 },
		color: { type: 'literal', value: [0.2, 0.9, 1] },
		rightColor: { type: 'literal', value: [1, 0.3, 0.6] },
	}),
});
