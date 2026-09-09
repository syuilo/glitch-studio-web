import test from './fx-definitions/test.ts';
import type { EffectDefinition } from './fx-definition.ts';
import type { FxParamDefs } from '@glitch/shared/types.ts';

const _fxDefinitions = {
	test,
} as Record<string, Omit<EffectDefinition<any>, 'paramDefs'> & { paramDefs: FxParamDefs }>;

const fxDefinitions = {} as typeof _fxDefinitions;
Object.keys(_fxDefinitions).sort().forEach(key => {
	fxDefinitions[key] = _fxDefinitions[key];
});

export { fxDefinitions };
