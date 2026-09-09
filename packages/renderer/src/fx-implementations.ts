import bloom from './fx-implementations/bloom/main.ts';
import blur from './fx-implementations/blur/main.ts';
import channelShift from './fx-implementations/channelShift/main.ts';
import chromaticAberration from './fx-implementations/chromaticAberration/main.ts';
import fill from './fx-implementations/fill/main.ts';
import gradient from './fx-implementations/gradient/main.ts';
import image from './fx-implementations/image/main.ts';
import liquidMetal from './fx-implementations/liquidMetal/main.ts';
import multiply from './fx-implementations/multiply/main.ts';
import pixelSort from './fx-implementations/pixelSort/main.ts';
import quadtreeFilter from './fx-implementations/quadtreeFilter/main.ts';
import rainDropsOnWindow1 from './fx-implementations/rainDropsOnWindow1/main.ts';
import rainDropsOnWindow2 from './fx-implementations/rainDropsOnWindow2/main.ts';
import rgbTo from './fx-implementations/rgbTo/main.ts';
import shift from './fx-implementations/shift/main.ts';
import snoise from './fx-implementations/snoise/main.ts';
import symbols from './fx-implementations/symbols/main.ts';
import tearings from './fx-implementations/tearings/main.ts';
import test from './fx-implementations/test/main.ts';
import video from './fx-implementations/video/main.ts';
import water from './fx-implementations/water/main.ts';
import type { EffectImplementation } from './fx-implementation.js';

const _fxImplementations = {
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
} as Record<string, EffectImplementation<any>>;

const fxImplementations = {} as typeof _fxImplementations;
Object.keys(_fxImplementations).sort().forEach(key => {
	fxImplementations[key] = _fxImplementations[key];
});

export { fxImplementations };
