import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'vectorDisplacement',
	displayName: 'Vector displacement',
	category: 'effect',
	paramDefs: {
		input: { type: 'node', label: 'Input', primary: true },
		vector: { type: 'node', label: 'Vector' },
		amount: { type: 'range', label: 'Amount', min: -1, max: 1, step: 0.001 },
		flipX: { type: 'bool', label: 'Flip X' },
		flipY: { type: 'bool', label: 'Flip Y' },
		rotation: { type: 'range', label: 'Rotation (deg)', min: -180, max: 180, step: 0.1 },
		wrap: { type: 'enum', label: 'Wrap', options: [
			{ label: 'Clamp to edge', value: 'clampToEdge' },
			{ label: 'Repeat', value: 'repeat' },
			{ label: 'Repeat (Mirrored)', value: 'repeatMirrored' },
		] },
	},
	getDefaultParams: () => ({
		vector: { type: 'literal', value: null },
		amount: { type: 'literal', value: 0.05 },
		flipX: { type: 'literal', value: false },
		flipY: { type: 'literal', value: false },
		rotation: { type: 'literal', value: 0 },
		wrap: { type: 'literal', value: 'repeatMirrored' },
	}),
});
