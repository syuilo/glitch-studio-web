import { defineEffect } from '../fx-definition.ts';

export default defineEffect({
	name: 'pointerTrail',
	displayName: 'pointerTrail',
	category: 'utility',
	paramDefs: {
		radius: { type: 'range', min: 0, max: 2, step: 0.01, label: 'Radius', default: { type: 'literal', value: 0.3 } },
		halfLife: { type: 'range', min: 1, max: 5000, step: 1, label: 'Half-life (ms)', default: { type: 'literal', value: 300 } },
	},
	getDefaultParams: () => ({
		radius: { type: 'literal', value: 0.3 },
		halfLife: { type: 'literal', value: 300 },
	}),
});
