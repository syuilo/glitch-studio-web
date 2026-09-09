// Adapted from Paper Design's Liquid Metal (Apache-2.0; see ../../../renderer/src/fx-implementations/liquidMetal/LICENSE).
// Modified for WebGPU and live node inputs; no uploaded-image or shape selector.
import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'liquidMetal',
	displayName: 'Liquid Metal',
	category: 'effect',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		colorBack: { type: 'color', label: 'Background color' },
		colorTint: { type: 'color', label: 'Tint color' },
		colorBackAlpha: { type: 'range', label: 'Background alpha', min: 0, max: 1, step: 0.01 },
		colorTintAlpha: { type: 'range', label: 'Tint alpha', min: 0, max: 1, step: 0.01 },
		repetition: { type: 'range', label: 'Repetition', min: 1, max: 10, step: 0.01 },
		softness: { type: 'range', label: 'Softness', min: 0, max: 1, step: 0.01 },
		shiftRed: { type: 'range', label: 'Shift red', min: -1, max: 1, step: 0.01 },
		shiftBlue: { type: 'range', label: 'Shift blue', min: -1, max: 1, step: 0.01 },
		distortion: { type: 'range', label: 'Distortion', min: 0, max: 1, step: 0.01 },
		contour: { type: 'range', label: 'Contour', min: 0, max: 1, step: 0.01 },
		angle: { type: 'range', label: 'Angle', min: 0, max: 360, step: 0.01 },
		time: { type: 'number', label: 'Time (s)', step: 0.01 },
		speed: { type: 'number', label: 'Speed', step: 0.01 },
		frame: { type: 'number', label: 'Frame offset (ms)', step: 1 },
	},
	getDefaultParams: () => ({
		colorBack: { type: 'literal', value: [170 / 255, 170 / 255, 172 / 255] },
		colorTint: { type: 'literal', value: [1, 1, 1] },
		colorBackAlpha: { type: 'literal', value: 0 },
		colorTintAlpha: { type: 'literal', value: 1 },
		repetition: { type: 'literal', value: 2 },
		softness: { type: 'literal', value: 0.2 },
		shiftRed: { type: 'literal', value: 0.3 },
		shiftBlue: { type: 'literal', value: 0.3 },
		distortion: { type: 'literal', value: 0.07 },
		contour: { type: 'literal', value: 1 },
		angle: { type: 'literal', value: 70 },
		time: { type: 'expression', value: 'TIME' },
		speed: { type: 'literal', value: 1 },
		frame: { type: 'literal', value: 0 },
	}),
});
