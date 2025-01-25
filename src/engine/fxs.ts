import colorClamp from './fx/color-clamp';
import channelShift_gpu from './fx/channel-shift';
import ghost from './fx/ghost';
import blockNoise from './fx/block-noise';
import shift from './fx/shift';
import pixelSortFast from './fx/pixel-sort-fast';
import pixelSort from './fx/pixel-sort';
import channelBend from './fx/channel-bend';
import rotate from './fx/rotate';
import maskBlockNoise from './fx/mask-block-noise';
import gradation from './fx/gradation';
import gradationCircle from './fx/gradation-circle';
import perlinNoise from './fx/perlin-noise';
import perlinNoiseHq from './fx/perlin-noise-hq';
import maskBlocks from './fx/mask-blocks';
import threshold from './fx/threshold';
import invert from './fx/invert';
import fill from './fx/fill';
import colorBlocks from './fx/color-blocks';
import tearings from './fx/tearings';
import blockShift from './fx/block-shift';
import grayscale from './fx/grayscale';
import lcd from './fx/lcd';
import grid from './fx/grid';
import gridDotted from './fx/grid-dotted';
import gridTexture from './fx/grid-texture';
import nodeGrid from './fx/node-grid';
import tiling from './fx/tiling';
import image from './fx/image';
import mix from './fx/mix';
import mixMapping from './fx/mixMapping';
import mask from './fx/mask';
import pixelShiftMapping from './fx/pixel-shift-mapping';
import digitalMosaic from './fx/digital-mosaic';
import colorThreshold from './fx/color-threshold';
import warp from './fx/warp';
import channelChange from './fx/channel-change';
import add from './fx/add';
import pixelate from './fx/pixelate';
import granular from './fx/granular';
import blockShiftMapping from './fx/block-shift-mapping';
import bikabika from './fx/bikabika';
import quadtreeFilter from './fx/quadtreeFilter';
import stripe from './fx/stripe';
import webcamera from './fx/webcamera';
import mirror from './fx/mirror';
import flip from './fx/flip';
import blockShuffle from './fx/block-shuffle';
import posterize from './fx/posterize';
import node from './fx/node';
import skew from './fx/skew';
import bitStreamer from './fx/bitStreamer';
import melt from './fx/melt';
import gif from './fx/gif';
import { GpuFx } from './types';
import channelShiftMapping from './fx/channel-shift-mapping';
import drosteRegression from './fx/drosteRegression';
import fastGaussianBlur from './fx/fastGaussianBlur';
import blurMapping from './fx/blurMapping';

const _fxs = {
	//swap,
	//tearing,
	//tearings,
	//blur,
	//channelShift,
	//colorBlocks,
	//replace,
	//crt,
	//fill,
	//threshold,
	//blockStretch,
	//continuousGhost,
	//pixelSort,
	//noise,
	//granular,
	//distortion,
	//grayscale,
	//overlay,
	//copy,
	//lcd,
	//pixelate,
	//levels,
	//colorRange_2,
	//colorRange,
	colorClamp,
	channelShift_gpu,
	channelShiftMapping,
	//ghost,
	//blockNoise,
	shift,
	//pixelSortFast,
	pixelSort,
	channelBend,
	rotate,
	maskBlockNoise,
	gradation,
	gradationCircle,
	perlinNoise,
	perlinNoiseHq,
	maskBlocks,
	threshold,
	invert,
	//maskOpacity,
	fill,
	colorBlocks,
	tearings,
	blockShift,
	grayscale,
	lcd,
	grid,
	gridDotted,
	gridTexture,
	nodeGrid,
	tiling,
	image,
	mix,
	mixMapping,
	mask,
	pixelShiftMapping,
	digitalMosaic,
	colorThreshold,
	warp,
	channelChange,
	add,
	pixelate,
	granular,
	blockShiftMapping,
	//bikabika,
	quadtreeFilter,
	stripe,
	webcamera,
	mirror,
	flip,
	blockShuffle,
	posterize,
	node,
	skew,
	bitStreamer,
	melt,
	drosteRegression,
	fastGaussianBlur,
	blurMapping,
	//gif,
} as Record<string, GpuFx<any>>;

const fxs = {} as typeof _fxs;
Object.keys(_fxs).sort().forEach(key => {
	fxs[key] = _fxs[key];
});

export { fxs };
