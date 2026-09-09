import test from './fx-implementations/test/main.js';
import type { EffectImplementation } from './fx-implementation.js';

const _fxImplementations = {
	test,
} as Record<string, EffectImplementation<any>>;

const fxImplementations = {} as typeof _fxImplementations;
Object.keys(_fxImplementations).sort().forEach(key => {
	fxImplementations[key] = _fxImplementations[key];
});

export { fxImplementations };
