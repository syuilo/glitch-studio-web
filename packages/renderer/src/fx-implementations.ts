import test from './fx-implementations/test/main.js';
import fill from './fx-implementations/fill/main.js';
import shift from './fx-implementations/shift/main.js';
import snoise from './fx-implementations/snoise/main.js';
import gradient from './fx-implementations/gradient/main.js';
import multiply from './fx-implementations/multiply/main.js';
import image from './fx-implementations/image/main.js';
import video from './fx-implementations/video/main.js';
import quadtreeFilter from './fx-implementations/quadtreeFilter/main.js';
import chromaticAberration from './fx-implementations/chromaticAberration/main.js';
import channelShift from './fx-implementations/channelShift/main.js';
import blur from './fx-implementations/blur/main.js';
import bloom from './fx-implementations/bloom/main.js';
import rgbTo from './fx-implementations/rgbTo/main.js';
import tearings from './fx-implementations/tearings/main.js';
import pixelSort from './fx-implementations/pixelSort/main.js';
import rainDropsOnWindow1 from './fx-implementations/rainDropsOnWindow1/main.js';
import rainDropsOnWindow2 from './fx-implementations/rainDropsOnWindow2/main.js';
import liquidMetal from './fx-implementations/liquidMetal/main.js';
import water from './fx-implementations/water/main.js';
import symbols from './fx-implementations/symbols/main.js';
import type { FxParamDefs } from '@glitch/shared/types.ts';

const _fxs = {
	test,
	fill,
	shift,
	snoise,
	gradient,
	multiply,
	image,
	video,
	quadtreeFilter,
	chromaticAberration,
	channelShift,
	blur,
	bloom,
	rgbTo,
	tearings,
	pixelSort,
	rainDropsOnWindow1,
	rainDropsOnWindow2,
	liquidMetal,
	water,
	symbols,
} as Record<string, Omit<Effect<any>, 'paramDefs'> & { paramDefs: FxParamDefs }>;

const fxs = {} as typeof _fxs;
Object.keys(_fxs).sort().forEach(key => {
	fxs[key] = _fxs[key];
});

export { fxs };
