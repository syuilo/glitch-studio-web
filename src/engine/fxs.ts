import test from './fx/test/main.ts';
import fill from './fx/fill/main.ts';
import shift from './fx/shift/main.ts';
import { GpuFx } from './types';

const _fxs = {
	test,
	fill,
	shift,
} as Record<string, GpuFx<any>>;

const fxs = {} as typeof _fxs;
Object.keys(_fxs).sort().forEach(key => {
	fxs[key] = _fxs[key];
});

export { fxs };
