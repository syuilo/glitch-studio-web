import { defineEffect } from '../fx-definition.ts';

const fitOptions = [
	{ label: 'Stretch', value: 'stretch' },
	{ label: 'Cover', value: 'cover' },
	{ label: 'Contain', value: 'contain' },
] as const;

const paramDefs = {
	inputA: { type: 'node', label: 'A', primary: true },
	inputB: { type: 'node', label: 'B' },
	fitModeA: { type: 'enum', label: 'A fit mode', options: fitOptions },
	fitModeB: { type: 'enum', label: 'B fit mode', options: fitOptions },
	amount: { type: 'range', label: 'Amount', min: 0, max: 1, step: 0.01, canNode: true },
	fitModeAmount: { type: 'enum', label: 'Amount fit mode', options: fitOptions },
} as const;

const getDefaultParams = () => ({
	inputA: { type: 'literal', value: null },
	inputB: { type: 'literal', value: null },
	fitModeA: { type: 'literal', value: 'contain' },
	fitModeB: { type: 'literal', value: 'contain' },
	amount: { type: 'literal', value: 0.5 },
	// 数値から作る1×1テクスチャも全域に適用する。
	fitModeAmount: { type: 'literal', value: 'stretch' },
} as const);

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
} as const;

export const mix = defineEffect({ name: 'mix', displayName: 'Mix', category: 'effect', paramDefs, getDefaultParams });
export const dataMix = defineEffect({ name: 'dataMix', displayName: 'Data Mix', category: 'utility', paramDefs, getDefaultParams });
export const blend = defineEffect({
	name: 'blend', displayName: 'Blend', category: 'effect',
	paramDefs: { ...paramDefs, blendMode },
	getDefaultParams: () => ({ ...getDefaultParams(), amount: { type: 'literal', value: 1 }, blendMode: { type: 'literal', value: 'normal' } }),
});
export const dataBlend = defineEffect({ ...blend, name: 'dataBlend', displayName: 'Data Blend', category: 'utility' });
