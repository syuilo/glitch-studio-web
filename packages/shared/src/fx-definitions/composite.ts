import { defineEffect } from '../fx-definition.ts';

const fitOptions = [
	{ label: 'Stretch', value: 'stretch' },
	{ label: 'Cover', value: 'cover' },
	{ label: 'Contain', value: 'contain' },
] as const;

const paramDefs = {
	inputA: { type: 'node', label: 'A', dataType: 'any', primary: true, default: () => ({ type: 'literal', value: null } as const) },
	inputB: { type: 'node', label: 'B', dataType: 'any', default: () => ({ type: 'literal', value: null } as const) },
	fitModeA: { type: 'enum', label: 'A fit mode', options: fitOptions, default: () => ({ type: 'literal', value: 'cover' } as const) },
	fitModeB: { type: 'enum', label: 'B fit mode', options: fitOptions, default: () => ({ type: 'literal', value: 'cover' } as const) },
	amount: { type: 'range', label: 'Amount', min: 0, max: 1, step: 0.01, canNode: true, default: () => ({ type: 'literal', value: 0.5 } as const) },
	// 数値から作る1×1テクスチャも全域に適用する。
	fitModeAmount: { type: 'enum', label: 'Amount fit mode', options: fitOptions, default: () => ({ type: 'literal', value: 'stretch' } as const) },
} as const;

const blendMode = {
	type: 'enum', label: 'Blend mode', options: [
		{ label: 'Normal', value: 'normal' },
		{ label: 'Add', value: 'add' },
		{ label: 'Subtract', value: 'subtract' },
		{ label: 'Multiply', value: 'multiply' },
		{ label: 'Min (Darken)', value: 'min' },
		{ label: 'Max (Lighten)', value: 'max' },
		{ label: 'Screen', value: 'screen' },
		{ label: 'Overlay', value: 'overlay' },
		{ label: 'Difference', value: 'difference' },
		{ label: 'Exclusion', value: 'exclusion' },
	],
	default: () => ({ type: 'literal', value: 'add' } as const),
} as const;

export const mix = defineEffect({ name: 'mix', displayName: 'Mix', category: 'effect', paramDefs, outputs: { output: { dataType: 'color' } } });
export const dataMix = defineEffect({ name: 'dataMix', displayName: 'Data Mix', category: 'utility', paramDefs, outputs: { output: { dataType: 'any' } } });
export const blend = defineEffect({
	name: 'blend', displayName: 'Blend', category: 'effect',
	paramDefs: {
		...paramDefs,
		amount: { ...paramDefs.amount, default: () => ({ type: 'literal', value: 1 }) },
		blendMode,
	},
	outputs: { output: { dataType: 'color' } },
});
export const dataBlend = defineEffect({ ...blend, name: 'dataBlend', displayName: 'Data Blend', category: 'utility' });
