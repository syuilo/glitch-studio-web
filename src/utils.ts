import { FxParamDef } from '@/types';
import { ulid } from 'ulid';
import CubicBezierEasing from 'bezier-easing';
import { GsAutomation } from './engine/types';
import { rawBezierEasing } from './bezier';

export function genEmptyValue(paramDef: Omit<FxParamDef, 'default'>): any {
	if (paramDef.type === 'number') {
		return 0;
	} else if (paramDef.type === 'range') {
		let v = 0;
		if (paramDef.hasOwnProperty('min')) v = Math.max((paramDef as any)['min'], v);
		if (paramDef.hasOwnProperty('max')) v = Math.min((paramDef as any)['max'], v);
		return v;
	} else if (paramDef.type === 'range2') {
		return [(paramDef as any)['min'], (paramDef as any)['max']];
	} else if (paramDef.type === 'enum') {
		return (paramDef as any)['options'][0].value;
	} else if (paramDef.type === 'bool') {
		return false;
	} else if (paramDef.type === 'blendMode') {
		return 'normal';
	} else if (paramDef.type === 'signal') {
		return [false, false, false];
	} else if (paramDef.type === 'xy') {
		return [0, 0];
	} else if (paramDef.type === 'wh') {
		return [1024, 1024];
	} else if (paramDef.type === 'color') {
		return [0, 0, 0];
	} else if (paramDef.type === 'seed') {
		return 0;
	} else if (paramDef.type === 'image') {
		return null;
	}
}

export function genId(): string {
	return ulid().toLowerCase();
}

export function rndstr(s = 'abcdefghijklmnopqrstuvwxyz0123456789', n = 5): string {
	return Array.from(Array(n)).map(()=>s[Math.floor(Math.random()*s.length)]).join('');
}

export function dragListen(move: (ev: MouseEvent) => void, end?: () => void) {
	window.addEventListener('mousemove', move);
	window.addEventListener('mouseleave', dragClear.bind(null, move, end));
	window.addEventListener('mouseup', dragClear.bind(null, move, end));
}

function dragClear(move, end?) {
	if (end) end();
	window.removeEventListener('mousemove', move);
	window.removeEventListener('mouseleave', dragClear);
	window.removeEventListener('mouseup', dragClear);
}

// https://stackoverflow.com/questions/326679/choosing-an-attractive-linear-scale-for-a-graphs-y-axis
// https://github.com/apexcharts/apexcharts.js/blob/master/src/modules/Scales.js
// This routine creates the Y axis values for a graph.
export function niceScale(lowerBound: number, upperBound: number, ticks: number): number[] {
	if (lowerBound === 0 && upperBound === 0) return [0];

	// Calculate Min amd Max graphical labels and graph
	// increments.  The number of ticks defaults to
	// 10 which is the SUGGESTED value.  Any tick value
	// entered is used as a suggested value which is
	// adjusted to be a 'pretty' value.
	//
	// Output will be an array of the Y axis values that
	// encompass the Y values.
	const steps: number[] = [];

	// Determine Range
	const range = upperBound - lowerBound;

	let tiks = ticks + 1;
	// Adjust ticks if needed
	if (tiks < 2) {
		tiks = 2;
	} else if (tiks > 2) {
		tiks -= 2;
	}

	// Get raw step value
	const tempStep = range / tiks;

	// Calculate pretty step value
	const mag = Math.floor(Math.log10(tempStep));
	const magPow = Math.pow(10, mag);
	const magMsd = (parseInt as any)(tempStep / magPow);
	const stepSize = magMsd * magPow;

	// build Y label array.
	// Lower and upper bounds calculations
	const lb = stepSize * Math.floor(lowerBound / stepSize);
	const ub = stepSize * Math.ceil(upperBound / stepSize);
	// Build array
	let val = lb;
	while (1) {
		steps.push(val);
		val += stepSize;
		if (val > ub) {
			break;
		}
	}

	return steps;
}

export function evalAutomationValue(automation: GsAutomation, frame: number): number {
	const prevKeyframe = automation.keyframes.filter(k => k.frame <= frame)
		.sort((a, b) => b.frame - a.frame)
		.sort((a, b) => automation.keyframes.indexOf(b) - automation.keyframes.indexOf(a))[0]; // 同一フレーム内に複数のキーフレームがある場合は、後のものを選択
	const nextKeyframe = automation.keyframes.find(k => (k.frame >= frame));
	if (prevKeyframe == null) {
		return 0;
	} else if (nextKeyframe == null) {
		return prevKeyframe.value;
	} else if (prevKeyframe === nextKeyframe) {
		return prevKeyframe.value;
	}
	return rawBezierEasing(
		prevKeyframe.frame,
		prevKeyframe.frame + prevKeyframe.bezierControlPointB[0],
		nextKeyframe.frame + nextKeyframe.bezierControlPointA[0],
		nextKeyframe.frame,
		prevKeyframe.value,
		prevKeyframe.value + prevKeyframe.bezierControlPointB[1],
		nextKeyframe.value + nextKeyframe.bezierControlPointA[1],
		nextKeyframe.value,
		frame
	);
}

export function insertIntermediateNumbers(array: number[]): number[] {
	const result = [] as number[];
	for (let i = 0; i < array.length - 1; i++) {
		result.push(array[i]);
		const diff = (array[i + 1] - array[i]) / 2;
		result.push(array[i] + diff);
	}
	result.push(array[array.length - 1]);
	return result;
}

export function nearlyEqual(a: number, b: number, epsilon = 0.0001): boolean {
	return Math.abs(a - b) < epsilon;
}
