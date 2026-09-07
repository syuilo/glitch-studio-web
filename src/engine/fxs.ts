import { Effect } from './fx-utils.ts';

import test from './fx/test/main.ts';
import fill from './fx/fill/main.ts';
import shift from './fx/shift/main.ts';
import snoise from './fx/snoise/main.ts';
import multiply from './fx/multiply/main.ts';
import image from './fx/image/main.ts';
import video from './fx/video/main.ts';
import quadtreeFilter from './fx/quadtreeFilter/main.ts';
import chromaticAberration from './fx/chromaticAberration/main.ts';
import channelShift from './fx/channelShift/main.ts';
import blur from './fx/blur/main.ts'; 
import rgbTo from './fx/rgbTo/main.ts'; 

const _fxs = {
	test,
	fill,
	shift,
	snoise,
	multiply,
	image,
	video,
	quadtreeFilter,
	chromaticAberration,
	channelShift,
	blur,
	rgbTo,
} as Record<string, Effect<any>>;

const fxs = {} as typeof _fxs;
Object.keys(_fxs).sort().forEach(key => {
	fxs[key] = _fxs[key];
});

export { fxs };
