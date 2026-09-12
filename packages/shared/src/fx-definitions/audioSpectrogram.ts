import { defineEffect } from '../fx-definition.ts';
import spectrum from './audioSpectrum.ts';

const { color, rightColor, ...analysisParams } = spectrum.paramDefs;

export default defineEffect({
	name: 'audioSpectrogram',
	displayName: 'Audio Spectrogram',
	category: 'draw',
	paramDefs: {
		...analysisParams,
		duration: { type: 'range', label: 'Time span (seconds)', min: 0.5, max: 60, step: 0.5 },
		orientation: { type: 'enum', label: 'Time axis', options: [
			{ label: 'Horizontal', value: 'horizontal' }, { label: 'Vertical', value: 'vertical' },
		] },
		direction: { type: 'enum', label: 'Flow direction', options: [
			{ label: 'Right to left / Top to bottom', value: 'forward' },
			{ label: 'Left to right / Bottom to top', value: 'reverse' },
		] },
		flipFrequency: { type: 'bool', label: 'Reverse frequency axis' },
	},
	getDefaultParams: () => {
		const { color, rightColor, ...analysisDefaults } = spectrum.getDefaultParams();
		return {
			...analysisDefaults,
			channel: { type: 'literal', value: 'mix' },
			smoothing: { type: 'literal', value: 0 },
			duration: { type: 'literal', value: 10 },
			orientation: { type: 'literal', value: 'horizontal' },
			direction: { type: 'literal', value: 'forward' },
			flipFrequency: { type: 'literal', value: false },
		};
	},
	outputs: {
		output: { dataType: 'color' },
	},
});
