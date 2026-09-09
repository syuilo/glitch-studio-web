import bloom from './fx-definitions/bloom.ts';
import blur from './fx-definitions/blur.ts';
import channelShift from './fx-definitions/channelShift.ts';
import chromaticAberration from './fx-definitions/chromaticAberration.ts';
import fill from './fx-definitions/fill.ts';
import gradient from './fx-definitions/gradient.ts';
import image from './fx-definitions/image.ts';
import liquidMetal from './fx-definitions/liquidMetal.ts';
import multiply from './fx-definitions/multiply.ts';
import pixelSort from './fx-definitions/pixelSort.ts';
import quadtreeFilter from './fx-definitions/quadtreeFilter.ts';
import rainDropsOnWindow1 from './fx-definitions/rainDropsOnWindow1.ts';
import rainDropsOnWindow2 from './fx-definitions/rainDropsOnWindow2.ts';
import rgbTo from './fx-definitions/rgbTo.ts';
import shift from './fx-definitions/shift.ts';
import snoise from './fx-definitions/snoise.ts';
import symbols from './fx-definitions/symbols.ts';
import tearings from './fx-definitions/tearings.ts';
import test from './fx-definitions/test.ts';
import video from './fx-definitions/video.ts';
import water from './fx-definitions/water.ts';
import type { EffectDefinition } from './fx-definition.ts';
import type { FxParamDefs } from '@glitch/shared/types.ts';

const _fxDefinitions = {
	bloom,
	blur,
	channelShift,
	chromaticAberration,
	fill,
	gradient,
	image,
	liquidMetal,
	multiply,
	pixelSort,
	quadtreeFilter,
	rainDropsOnWindow1,
	rainDropsOnWindow2,
	rgbTo,
	shift,
	snoise,
	symbols,
	tearings,
	test,
	video,
	water,
} as Record<string, Omit<EffectDefinition<any>, 'paramDefs'> & { paramDefs: FxParamDefs }>;

const fxDefinitions = {} as typeof _fxDefinitions;
Object.keys(_fxDefinitions).sort().forEach(key => {
	fxDefinitions[key] = _fxDefinitions[key];
});

export { fxDefinitions };
