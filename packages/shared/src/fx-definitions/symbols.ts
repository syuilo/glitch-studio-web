import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'symbols',
	displayName: 'Symbols',
	category: 'effect',
	paramDefs: {
		input: { type: 'node', label: 'Input', dataType: 'color', primary: true },
		iconset: { type: 'enum', label: 'Iconset', options: [{
			value: 'symbols_numbers', label: 'Symbols + Numbers',
		}, {
			value: 'symbols', label: 'Symbols',
		}, {
			value: 'numbers', label: 'Numbers',
		}, {
			value: 'sweets', label: 'Sweets',
		}] },
		highlightClipThreshold: { type: 'range', label: 'Highlight Clip Threshold', min: 0, max: 1, step: 0.01 },
		shadowClipThreshold: { type: 'range', label: 'Shadow Clip Threshold', min: 0, max: 1, step: 0.01 },
		divisions: { type: 'range', min: 8, max: 512, step: 1, label: 'Cell Divisions' },
		margin: { type: 'range', min: 0, max: 1, step: 0.01, label: 'Cell Margin' },
		symbolTexturesRangeMin: { type: 'range', min: 0, max: 1, step: 0.01, label: 'Symbol Textures Range Min' },
		symbolTexturesRangeMax: { type: 'range', min: 0, max: 1, step: 0.01, label: 'Symbol Textures Range Max' },
		bgColor: { type: 'color', label: 'Background Color' },
		colorA: { type: 'color', label: 'Color A' },
		colorB: { type: 'color', label: 'Color B' },
		colorC: { type: 'color', label: 'Color C' },
		similarityThresholdFactor: { type: 'range', min: 0, max: 32, step: 0.1, label: 'Similarity Threshold Factor' },
		forceField: { type: 'node', dataType: 'vector', label: 'Force Field' },
		forceFieldShift: { type: 'bool', label: 'Force Field Shift' },
		forceFieldWarp: { type: 'bool', label: 'Force Field Warp' },
	},
	getDefaultParams: () => ({
		iconset: { type: 'literal', value: 'symbols' },
		highlightClipThreshold: { type: 'literal', value: 0.8 },
		shadowClipThreshold: { type: 'literal', value: 0.2 },
		divisions: { type: 'literal', value: 64 },
		margin: { type: 'literal', value: 0.25 },
		symbolTexturesRangeMin: { type: 'literal', value: 0 },
		symbolTexturesRangeMax: { type: 'literal', value: 1 },
		bgColor: { type: 'literal', value: [0, 0, 0, 1] },
		colorA: { type: 'literal', value: [1, 1, 1, 1] },
		colorB: { type: 'literal', value: [0.8, 1, 0, 1] },
		colorC: { type: 'literal', value: [1, 0.3, 0, 1] },
		similarityThresholdFactor: { type: 'literal', value: 2 },
		forceField: { type: 'literal', value: null },
		forceFieldShift: { type: 'literal', value: true },
		forceFieldWarp: { type: 'literal', value: true },
	}),
	outputs: {
		output: { dataType: 'color' },
	},
});
