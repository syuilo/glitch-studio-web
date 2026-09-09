import test from './fx/test/main.js';
import fill from './fx/fill/main.js';
import shift from './fx/shift/main.js';
import snoise from './fx/snoise/main.js';
import gradient from './fx/gradient/main.js';
import multiply from './fx/multiply/main.js';
import image from './fx/image/main.js';
import video from './fx/video/main.js';
import quadtreeFilter from './fx/quadtreeFilter/main.js';
import chromaticAberration from './fx/chromaticAberration/main.js';
import channelShift from './fx/channelShift/main.js';
import blur from './fx/blur/main.js';
import bloom from './fx/bloom/main.js';
import rgbTo from './fx/rgbTo/main.js';
import tearings from './fx/tearings/main.js';
import pixelSort from './fx/pixelSort/main.js';
import rainDropsOnWindow1 from './fx/rainDropsOnWindow1/main.js';
import rainDropsOnWindow2 from './fx/rainDropsOnWindow2/main.js';
import liquidMetal from './fx/liquidMetal/main.js';
import water from './fx/water/main.js';
import symbols from './fx/symbols/main.js';
import type { Effect } from './fx-utils.js';
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
