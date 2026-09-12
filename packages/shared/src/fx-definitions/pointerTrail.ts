import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'pointerTrail',
	displayName: 'pointerTrail',
	category: 'utility',
	paramDefs: {
		strength: { type: 'range', min: 0, max: 2, step: 0.01, label: 'Strength', default: { type: 'literal', value: 0.3 } },
		radius: { type: 'range', min: 0, max: 2, step: 0.01, label: 'Radius', default: { type: 'literal', value: 0.3 } },
		halfLife: { type: 'range', min: 1, max: 5000, step: 1, label: 'Half-life (ms)', default: { type: 'literal', value: 300 } },
	},
	getDefaultParams: () => ({
		strength: { type: 'literal', value: 0.3 },
		radius: { type: 'literal', value: 0.3 },
		halfLife: { type: 'literal', value: 300 },
	}),
	outputs: {
		output: { dataType: 'vector' },
	},
});
