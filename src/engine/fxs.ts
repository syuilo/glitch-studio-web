import type { FxParamDefs } from '../types.ts';
import { Effect } from './fx-utils.ts';

import test from './fx/test/main.ts';
import fill from './fx/fill/main.ts';
import shift from './fx/shift/main.ts';
import snoise from './fx/snoise/main.ts';
import gradient from './fx/gradient/main.ts';
import multiply from './fx/multiply/main.ts';
import image from './fx/image/main.ts';
import video from './fx/video/main.ts';
import quadtreeFilter from './fx/quadtreeFilter/main.ts';
import chromaticAberration from './fx/chromaticAberration/main.ts';
import channelShift from './fx/channelShift/main.ts';
import blur from './fx/blur/main.ts';
import bloom from './fx/bloom/main.ts';
import rgbTo from './fx/rgbTo/main.ts';
import tearings from './fx/tearings/main.ts';
import pixelSort from './fx/pixelSort/main.ts';
import rainDropsOnWindow1 from './fx/rainDropsOnWindow1/main.ts';
import rainDropsOnWindow2 from './fx/rainDropsOnWindow2/main.ts';
import liquidMetal from './fx/liquidMetal/main.ts';
import water from './fx/water/main.ts';

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
} as Record<string, Omit<Effect<any>, 'paramDefs'> & { paramDefs: FxParamDefs }>;

const fxs = {} as typeof _fxs;
Object.keys(_fxs).sort().forEach(key => {
	fxs[key] = _fxs[key];
});

export { fxs };
