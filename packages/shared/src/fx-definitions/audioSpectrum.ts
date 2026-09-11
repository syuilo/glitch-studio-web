import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'audioSpectrum',
	displayName: 'Audio Spectrum',
	category: 'draw',
	paramDefs: {
		player: { type: 'player', label: 'Player' },
		channel: { type: 'enum', label: 'Channel', options: [
			{ label: 'Left', value: 'left' }, { label: 'Right', value: 'right' },
			{ label: 'Mix (L + R)', value: 'mix' }, { label: 'Stereo', value: 'stereo' },
		] },
		fftSize: { type: 'enum', label: 'FFT size', options: [
			{ label: '256', value: 256 }, { label: '512', value: 512 },
			{ label: '1024', value: 1024 }, { label: '2048', value: 2048 },
			{ label: '4096', value: 4096 }, { label: '8192', value: 8192 },
			{ label: '16384', value: 16384 }, { label: '32768', value: 32768 },
		] },
		window: { type: 'enum', label: 'Window', options: [
			{ label: 'Hann', value: 'hann' }, { label: 'Hamming', value: 'hamming' },
			{ label: 'Blackman', value: 'blackman' }, { label: 'Rectangular', value: 'rectangular' },
		] },
		smoothing: { type: 'range', label: 'Smoothing (seconds)', min: 0, max: 2, step: 0.01 },
		minFrequency: { type: 'number', label: 'Minimum frequency (Hz)', min: 0, max: 96000, step: 1 },
		maxFrequency: { type: 'number', label: 'Maximum frequency (Hz)', min: 1, max: 96000, step: 1 },
		logarithmic: { type: 'bool', label: 'Logarithmic frequency' },
		minDb: { type: 'range', label: 'Minimum dB', min: -120, max: -1, step: 1 },
		maxDb: { type: 'range', label: 'Maximum dB', min: -60, max: 20, step: 1 },
		color: { type: 'color', label: 'Color (L)' },
		rightColor: { type: 'color', label: 'Color (R)' },
	},
	getDefaultParams: () => ({
		player: { type: 'literal', value: null },
		channel: { type: 'literal', value: 'stereo' },
		fftSize: { type: 'literal', value: 2048 },
		window: { type: 'literal', value: 'hann' },
		smoothing: { type: 'literal', value: 0.15 },
		minFrequency: { type: 'literal', value: 20 },
		maxFrequency: { type: 'literal', value: 20000 },
		logarithmic: { type: 'literal', value: true },
		minDb: { type: 'literal', value: -80 },
		maxDb: { type: 'literal', value: 0 },
		color: { type: 'literal', value: [0.2, 0.9, 1] },
		rightColor: { type: 'literal', value: [1, 0.3, 0.6] },
	}),
});
