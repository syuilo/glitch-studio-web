import accumulate from './fx-implementations/accumulate/main.ts';
import audioWaveform from './fx-implementations/audioWaveform/main.ts';
import audioSpectrum from './fx-implementations/audioSpectrum/main.ts';
import audioSpectrogram from './fx-implementations/audioSpectrogram/main.ts';
import bloom from './fx-implementations/bloom/main.ts';
import blur from './fx-implementations/blur/main.ts';
import channelShift from './fx-implementations/channelShift/main.ts';
import chromaticAberration from './fx-implementations/chromaticAberration/main.ts';
import fill from './fx-implementations/fill/main.ts';
import frameDifference from './fx-implementations/frameDifference/main.ts';
import gradient from './fx-implementations/gradient/main.ts';
import histogram from './fx-implementations/histogram/main.ts';
import image from './fx-implementations/image/main.ts';
import liquidMetal from './fx-implementations/liquidMetal/main.ts';
import multiply from './fx-implementations/multiply/main.ts';
import opticalFlow from './fx-implementations/opticalFlow/main.ts';
import vectorDisplacement from './fx-implementations/vectorDisplacement/main.ts';
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
import waveform from './fx-implementations/waveform/main.ts';
import pointerTrail from './fx-implementations/pointerTrail/main.ts';
import type { EffectImplementation } from './fx-implementation.ts';

const _fxImplementations = {
	audioWaveform,
	audioSpectrum,
	audioSpectrogram,
	accumulate,
	bloom,
	blur,
	channelShift,
	chromaticAberration,
	fill,
	frameDifference,
	gradient,
	histogram,
	image,
	liquidMetal,
	multiply,
	opticalFlow,
	vectorDisplacement,
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
	waveform,
	pointerTrail,
} as Record<string, EffectImplementation<any>>;

const fxImplementations = {} as typeof _fxImplementations;
Object.keys(_fxImplementations).sort().forEach(key => {
	fxImplementations[key] = _fxImplementations[key];
});

export { fxImplementations };
