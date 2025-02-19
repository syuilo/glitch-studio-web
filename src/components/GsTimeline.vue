<template>
<div :class="$style.root">
	<div :class="$style.header">
		<GsButton v-if="playing" @click="stop"><Fa :icon="faPause"/> Stop</GsButton>
		<GsButton v-else @click="play"><Fa :icon="faPlay"/> Play</GsButton>
		<div :class="$style.frameCount">{{ frame.toString().padStart(5, '0') }}</div>
	</div>
	<div :class="$style.body">
		<div :class="$style.side">
			<GsButton @click="addAutomation">Add automation</GsButton>

			<GsButton v-for="automation of store.automations" :key="automation.id" :primary="selectedAutomation?.id === automation.id" @click="switchAutomation(automation)">{{ automation.name }}</GsButton>
		</div>
		<div :class="$style.tl" @wheel="onTlWheel" @mousemove="onTlMousemove" @mousedown="onTlMousedown" @keydown="onTlKeydown" tabindex="-1" ref="tlEl">
			<div :class="$style.yTicks" @wheel="onYTicksWheel">
				<div v-for="v of yTicks" :class="[$style.yTick, { [$style.yTickActive]: snappingY != null && nearlyEqual(snappingY, v) }]" :style="{ top: valueToDomY(v) + 'px' }">{{ v.toFixed(2) }}</div>
			</div>
			<div :class="$style.xTicks" @wheel="onXTicksWheel">
				<div v-for="frame of xTicks" :class="$style.xTick" :style="{ left: frameToDomX(frame) + 'px' }">{{ frame }}</div>
				<div :class="$style.xTicksSeekBar" :style="{ left: (seekBarPos - 1) + 'px' }" @mousedown="onSeekBarMousedown" ></div>
			</div>
			<div :class="$style.ticksCorner"></div>
			<div :class="$style.tlRange" :style="{ width: tlRangeElWidth + 'px', left: tlRangeElPosX + 'px' }"></div>
			<div :class="$style.selectedArea" :style="{ width: selectedAreaElWidth + 'px', height: selectedAreaElHeight + 'px', bottom: selectedAreaElPosY + 'px', left: selectedAreaElPosX + 'px' }"></div>
			<div v-for="frame of xTicks" :class="[$style.inTlXTick]" :style="{ left: frameToDomX(frame) + 'px' }"></div>
			<div v-for="v of yTicks" :class="[$style.inTlYTick, { [$style.inTlYTickZero]: v.toFixed(2).replace('-', '') === '0.00', [$style.inTlYTickActive]: snappingY != null && nearlyEqual(snappingY, v) }]" :style="{ top: valueToDomY(v) + 'px' }"></div>
			<div :class="$style.seekBar" :style="{ left: seekBarPos + 'px' }"><div :class="$style.seekBarFrame">{{ frame }}</div></div>
			<div :class="$style.valueBar" :style="{ top: valueBarPos + 'px' }"><div :class="$style.valueBarValue">{{ currentValue.toFixed(2) }}</div></div>
			<div :class="$style.crossPoint" :style="{ left: seekBarPos + 'px', top: valueBarPos + 'px' }"></div>
			<div v-if="!bezierDragging" :class="$style.cursorBar" :style="{ left: cursorBarPos + 'px' }"></div>
			<div :class="$style.automation" v-if="selectedAutomation">
				<svg version="1.1" :viewBox="`0 0 ${tlElWidth} ${tlElHeight}`" :class="$style.lines">
					<defs>
						<linearGradient id="tlAutomationGradient" x1="0" x2="0" y1="0" y2="1">
							<stop offset="0%" stop-color="var(--accentAlphaMiddleLow)"/>
							<stop :offset="automationPathGradientCenter + '%'" stop-color="var(--accentAlphaVeryLow)"/>
							<stop offset="100%" stop-color="var(--accentAlphaMiddleLow)"/>
						</linearGradient>
					</defs>
					<path :d="automationSvgPath" style="stroke: currentColor; fill: url(#tlAutomationGradient); stroke-width: 2;"/>
				</svg>

				<svg v-if="!nowSelecting && selectedKeyframe" version="1.1" :viewBox="`0 0 ${tlElWidth} ${tlElHeight}`" :class="$style.lines">
					<line v-if="bezierHandleADomPos"
						:x1="frameToDomX(selectedKeyframe.frame)"
						:y1="valueToDomY(selectedKeyframe.value)"
						:x2="bezierHandleADomPos[0]"
						:y2="bezierHandleADomPos[1]"
						style="stroke: #00f3ff; stroke-width: 1;"
					/>
					<line v-if="bezierHandleBDomPos"
						:x1="frameToDomX(selectedKeyframe.frame)"
						:y1="valueToDomY(selectedKeyframe.value)"
						:x2="bezierHandleBDomPos[0]"
						:y2="bezierHandleBDomPos[1]"
						style="stroke: #00f3ff; stroke-width: 1;"
					/>
				</svg>
			
				<div v-for="keyframe of selectedAutomation.keyframes"
					:class="[$style.keyframe, { [$style.selectedKeyframe]: selectedKeyframes.includes(keyframe) }]"
					:style="{ left: frameToDomX(keyframe.frame) + 'px', top: valueToDomY(keyframe.value) + 'px' }"
					@mousedown="onKeyframeMousedown($event, keyframe)"
					@contextmenu="onKeyframeContextmenu($event, keyframe)"
				></div>
			</div>

			<div v-if="(nowSelecting || selectedKeyframes.length === 0) && tooltipDomPos" :class="$style.tooltip" :style="{ left: tooltipDomPos[0] + 'px', top: tooltipDomPos[1] + 'px' }">
				<div>F: {{ cursorFrame }}</div>
				<div>V: {{ cursorValue }}</div>
			</div>

			<div v-if="!nowSelecting && contextmenuKeyframe" :class="$style.keyframeContextmenu" :style="{ left: keyframeContextmenuDomPos[0] + 'px', top: keyframeContextmenuDomPos[1] + 'px' }">
				<div>
					<div :class="$style.keyframeContextmenuHandle" style="cursor: ns-resize;" @mousedown="onKeyframeYHandleMousedown"><Fa :icon="faArrowsUpDown"/></div>
					<div :class="$style.keyframeContextmenuInput">V: {{ contextmenuKeyframe.value.toFixed(2) }}</div>
				</div>
				<div>
					<div :class="$style.keyframeContextmenuHandle" style="cursor: ew-resize;" @mousedown="onKeyframeXHandleMousedown"><Fa :icon="faArrowsLeftRight"/></div>
					<div :class="$style.keyframeContextmenuInput">F: {{ contextmenuKeyframe.frame }}</div>
				</div>
			</div>

			<div v-if="!nowSelecting && !isBezierAZero && bezierHandleADomPos" :class="$style.bezierHandle" :style="{ left: bezierHandleADomPos[0] + 'px', top: bezierHandleADomPos[1] + 'px' }" @mousedown="onBezierHandleAMousedown">
			</div>
			<div v-if="!nowSelecting && !isBezierBZero && bezierHandleBDomPos" :class="$style.bezierHandle" :style="{ left: bezierHandleBDomPos[0] + 'px', top: bezierHandleBDomPos[1] + 'px' }" @mousedown="onBezierHandleBMousedown">
			</div>

			<template v-if="bezierDragging">
				<div v-for="line of bezierSnapLinesX"
					:class="[$style.bezierSnapLineX, { [$style.bezierSnapLineXActive]: line.active }]"
					:style="{ left: line.x + 'px' }"
				></div>
				<div v-for="line of bezierSnapLinesY"
					:class="[$style.bezierSnapLineY, { [$style.bezierSnapLineYActive]: line.active }]"
					:style="{ left: line.x + 'px', top: line.y + 'px', width: line.width + 'px' }"
				></div>
			</template>

			<div :class="$style.infoBar">
				<div><b>TL Offset</b><code>{{ tlPosX.toFixed(2) }}</code>, <code>{{ tlPosY.toFixed(2) }}</code></div>
				<div><b>Cursor</b><code>{{ cursorFrame }}</code>, <code>{{ cursorValue }}</code></div>
				<div><b>Current</b><code>{{ frame.toString().padStart(5, '0') }}</code>, <code>{{ currentValue.toFixed(2) }}</code></div>
				<div><b>Min/Max</b><code>{{ minMaxValuesInTheAutomation.min.toFixed(2) }}</code>, <code>{{ minMaxValuesInTheAutomation.max.toFixed(2) }}</code></div>
				<div><b>Automation ID</b><code>{{ selectedAutomation ? selectedAutomation.id.toUpperCase() : '-' }}</code></div>
			</div>
		</div>
		<div :class="$style.rightSidePanel" v-if="selectedKeyframe">
			<div>Bezier</div>
			<GsButton :primary="!isBezierAZero" @click="toggleBezierA">A</GsButton>
			<GsButton :primary="!isBezierBZero" @click="toggleBezierB">B</GsButton>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { faArrowsLeftRight, faArrowsUpDown, faArrowsUpDownLeftRight, faPause, faPlay } from '@fortawesome/free-solid-svg-icons';
import GsButton from './GsButton.vue';
import { playing, frame, frameMax } from '@/app';
import { dragListen, evalAutomationValue, genId, insertIntermediateNumbers, niceScale, rndstr, nearlyEqual } from '@/utils';
import { GsAutomation, GsKeyframe } from '@/engine/types';
import { useStore } from '@/store';

const X_TICKS_HEIGHT = 20;
const Y_TICKS_WIDTH = 60;

const store = useStore();

const tlEl = shallowRef<HTMLElement>();
const tlElWidth = ref(0);
const tlElHeight = ref(0);
const tlRangeX = ref(60 * 3);
const tlRangeY = ref(5);
const tlPosX = ref(-30);
const tlPosY = ref(-2.5);
const snappingY = ref<number | null>(null);
const selectedAutomation = ref<GsAutomation | null>(null);
const selectedKeyframes = ref<GsKeyframe[]>([]);
const selectedKeyframe = computed(() => selectedKeyframes.value.length === 1 ? selectedKeyframes.value[0] : null);
const contextmenuKeyframe = ref<GsKeyframe | null>(null);
const seekBarPos = computed(() => {
	return frameToDomX(frame.value);
});
const currentValue = computed(() => {
	return selectedAutomation.value ? evalAutomationValue(selectedAutomation.value, frame.value) : 0;
});
const valueBarPos = computed(() => {
	return valueToDomY(currentValue.value);
});
const cursorBarPos = ref(0);
const tlRangeElPosX = computed(() => {
	return -((tlPosX.value / tlRangeX.value) * tlElWidth.value);
});
const tlRangeElWidth = computed(() => {
	return (frameMax.value / tlRangeX.value) * tlElWidth.value;
});
const tooltipDomPos = ref<null | [0, 0]>(null);
const keyframeContextmenuDomPos = computed(() => {
	if (!contextmenuKeyframe.value) return null;
	return [
		frameToDomX(contextmenuKeyframe.value.frame) + 5,
		valueToDomY(contextmenuKeyframe.value.value) + 5,
	];
});
const bezierHandleADomPos = computed(() => {
	if (!selectedKeyframe.value) return null;
	return [
		logicalXToDomX(selectedKeyframe.value.frame + selectedKeyframe.value.bezierControlPointA[0]),
		logicalYToDomY(selectedKeyframe.value.value + selectedKeyframe.value.bezierControlPointA[1]),
	];
});
const bezierHandleBDomPos = computed(() => {
	if (!selectedKeyframe.value) return null;
	return [
		logicalXToDomX(selectedKeyframe.value.frame + selectedKeyframe.value.bezierControlPointB[0]),
		logicalYToDomY(selectedKeyframe.value.value + selectedKeyframe.value.bezierControlPointB[1]),
	];
});
const isBezierAZero = computed(() => {
	if (!selectedKeyframe.value) return false;
	return selectedKeyframe.value.bezierControlPointA[0] === 0 && selectedKeyframe.value.bezierControlPointA[1] === 0;
});
const isBezierBZero = computed(() => {
	if (!selectedKeyframe.value) return false;
	return selectedKeyframe.value.bezierControlPointB[0] === 0 && selectedKeyframe.value.bezierControlPointB[1] === 0;
});
const cursorFrame = ref(0);
const cursorValue = ref(0);
const nowSelecting = ref(false);
const selectedAreaPosX = ref(0);
const selectedAreaPosY = ref(0);
const selectedAreaWidth = ref(0);
const selectedAreaHeight = ref(0);
const selectedAreaElPosX = computed(() => {
	return ((selectedAreaPosX.value - tlPosX.value) / tlRangeX.value) * tlElWidth.value;
});
const selectedAreaElPosY = computed(() => {
	return ((selectedAreaPosY.value - tlPosY.value) / tlRangeY.value) * tlElHeight.value;
});
const selectedAreaElWidth = computed(() => {
	return ((selectedAreaWidth.value) / tlRangeX.value) * tlElWidth.value;
});
const selectedAreaElHeight = computed(() => {
	return (((selectedAreaHeight.value) / tlRangeY.value) * tlElHeight.value);
});

const bezierDragging = ref(false);
const bezierSnapLinesX = ref<{ active?: boolean; x: number }[]>([]);
const bezierSnapLinesY = ref<{ active?: boolean; x: number; y: number; width: number }[]>([]);

// TODO: TLの表示DOMサイズに応じて変更
const xTicksCount = ref(15);
const xTicks = computed(() => niceScale(tlPosX.value, tlPosX.value + tlRangeX.value, xTicksCount.value));
const xTicksWithHalf = computed(() => insertIntermediateNumbers(xTicks.value));
const yTicksCount = ref(6);
const yTicks = computed(() => niceScale(tlPosY.value, tlPosY.value + tlRangeY.value, yTicksCount.value));
const yTicksWithHalf = computed(() => insertIntermediateNumbers(yTicks.value));

// TODO: もっと高速に計算する方法ないだろうか
const minMaxValuesInTheAutomation = computed(() => {
	if (!selectedAutomation.value) return { min: 0, max: 0 };
	let min = 0;
	let max = 0;
	for (let i = 0; i < frameMax.value; i++) {
		const fv = evalAutomationValue(selectedAutomation.value, i);
		if (fv < min) min = fv;
		if (fv > max) max = fv;
	}
	return {
		min,
		max,
	};
});

const automationSvgPath = computed(() => {
	if (!selectedAutomation.value) return '';
	const keyframes = selectedAutomation.value.keyframes;
	let d = `M ${frameToDomX(0)}, ${valueToDomY(0)} L ${frameToDomX(keyframes[0].frame)}, ${valueToDomY(keyframes[0].value)}`;
	for (let i = 0; i < keyframes.length - 1; i++) {
		const keyframe = keyframes[i];
		const dx1 = frameToDomX(Math.min(keyframes[i + 1].frame, keyframe.frame + (keyframe.bezierControlPointB[0])));
		const dy1 = valueToDomY(keyframe.value + (keyframe.bezierControlPointB[1]));
		const dx2 = frameToDomX(Math.max(keyframe.frame, keyframes[i + 1].frame + (keyframes[i + 1].bezierControlPointA[0])));
		const dy2 = valueToDomY(keyframes[i + 1].value + (keyframes[i + 1].bezierControlPointA[1]));
		const dx = frameToDomX(keyframes[i + 1].frame);
		const dy = valueToDomY(keyframes[i + 1].value);
		d += ` C ${dx1}, ${dy1} ${dx2}, ${dy2} ${dx}, ${dy}`;
	}
	d += ` L ${frameToDomX(keyframes[keyframes.length - 1].frame)}, ${valueToDomY(0)}`;
	return d;
});
const automationPathGradientCenter = computed(() => {
	if (!selectedAutomation.value) return 0;
	const max = minMaxValuesInTheAutomation.value.max;
	const min = Math.min(0, minMaxValuesInTheAutomation.value.min);
	if (max === 0 && min === 0) return 0;
	return ((max) / (max + Math.abs(min))) * 100;
});

function frameToDomX(frame: number): number {
	return ((frame - tlPosX.value) / tlRangeX.value) * tlElWidth.value;
}

function valueToDomY(value: number): number {
	return tlElHeight.value - (((value - tlPosY.value) / tlRangeY.value) * tlElHeight.value);
}

function logicalXToDomX(x: number): number {
	return frameToDomX(x);
}

function logicalYToDomY(y: number): number {
	return valueToDomY(y);
}

function domXToLogicalX(x: number): number {
	return ((x / tlElWidth.value) * tlRangeX.value);
}

function domXToFrame(x: number): number {
	return Math.round(domXToLogicalX(x) + tlPosX.value);
}

function domYToLogicalY(y: number): number {
	return ((1 - (y / tlElHeight.value)) * tlRangeY.value);
}

function domYToValue(y: number): number {
	return domYToLogicalY(y) + tlPosY.value;
}

function play() {
	playing.value = true;
}

function stop() {
	playing.value = false;
}

function addAutomation() {
	const automation: GsAutomation = {
		id: genId(),
		name: 'kf_' + rndstr('0123456789'),
		keyframes: [{
			id: genId(),
			frame: 0,
			value: 0,
			bezierControlPointA: [0, 0],
			bezierControlPointB: [10, 0],
		}, {
			id: genId(),
			frame: frameMax.value,
			value: 1,
			bezierControlPointA: [-10, 0],
			bezierControlPointB: [0, 0],
		}],
	};
	store.automations.push(automation);
	selectedAutomation.value = automation;
}

function switchAutomation(automation: GsAutomation) {
	selectedAutomation.value = automation;
}

function addKeyframe(frame: number, value: number): GsKeyframe {
	if (selectedAutomation.value == null) throw new Error('no selected automation');
	const keyframes = [] as GsKeyframe[];
	const keyframe: GsKeyframe = {
		id: genId(),
		frame,
		value,
		bezierControlPointA: [-10, 0],
		bezierControlPointB: [10, 0],
	};
	let pushed = false;
	if (selectedAutomation.value.keyframes.filter(kf => kf.frame === frame).length > 1) return;
	for (const kf of selectedAutomation.value.keyframes) {
		if (!pushed && kf.frame > frame) {
			keyframes.push(keyframe);
			keyframes.push(kf);
			pushed = true;
		} else {
			keyframes.push(kf);
		}
	}
	if (!pushed) {
		keyframes.push(keyframe);
	}
	selectedAutomation.value.keyframes = keyframes;
	return keyframe;
}

function onTlMousemove(ev: MouseEvent) {
	const rect = tlEl.value.getBoundingClientRect();
	const mouseX = ev.clientX - rect.left;
	const mouseY = ev.clientY - rect.top;
	const frame = domXToFrame(mouseX);
	cursorBarPos.value = frameToDomX(frame);

	const value = domYToValue(mouseY);
	cursorValue.value = value.toFixed(2);
	cursorFrame.value = frame;
	tooltipDomPos.value = [mouseX + 10, mouseY + 10];
}

function onTlWheel(ev: WheelEvent) {
	ev.preventDefault();

	tlRangeX.value *= 1 + (ev.deltaY / 1000);
	tlRangeY.value *= 1 + (ev.deltaY / 1000);

	const rect = tlEl.value.getBoundingClientRect();
	const x = ((ev.clientX - rect.left) * 2) - (tlElWidth.value / 2);
	const y = ((ev.clientY - rect.top) * 2) - (tlElHeight.value / 2);
	tlPosX.value = domXToLogicalX(x) - ((domXToLogicalX(x) - tlPosX.value) * (1 + (ev.deltaY / 1000)));
	tlPosY.value = domYToLogicalY(y) - ((domYToLogicalY(y) - tlPosY.value) * (1 + (ev.deltaY / 1000)));
}

function onXTicksWheel(ev: WheelEvent) {
	ev.preventDefault();
	ev.stopPropagation();
	
	tlRangeX.value *= 1 + (ev.deltaY / 1000);

	const rect = tlEl.value.getBoundingClientRect();
	const x = ((ev.clientX - rect.left) * 2) - (tlElWidth.value / 2);
	tlPosX.value = domXToLogicalX(x) - ((domXToLogicalX(x) - tlPosX.value) * (1 + (ev.deltaY / 1000)));
}

function onYTicksWheel(ev: WheelEvent) {
	ev.preventDefault();
	ev.stopPropagation();
	
	tlRangeY.value *= 1 + (ev.deltaY / 1000);

	const rect = tlEl.value.getBoundingClientRect();
	const y = ((ev.clientY - rect.top) * 2) - (tlElHeight.value / 2);
	tlPosY.value = domYToLogicalY(y) - ((domYToLogicalY(y) - tlPosY.value) * (1 + (ev.deltaY / 1000)));
}

function onTlDblclick(ev: MouseEvent) {
	if (ev.button === 1) return;
	if (selectedAutomation.value == null) {
		addAutomation();
	}

	const rect = tlEl.value.getBoundingClientRect();
	const clickX = ev.clientX - rect.left;
	const clickY = ev.clientY - rect.top;
	const frame = domXToFrame(clickX);
	let value = domYToValue(clickY);

	// snap
	for (const step of [...yTicksWithHalf.value, 1]) { // 1は重要なのでどんな時でもスナップ候補
		const stepY = valueToDomY(step);
		if (clickY > stepY - SNAP_THRESHOLD && clickY < stepY + SNAP_THRESHOLD) {
			value = step;
			break;
		}
	}
	
	const keyframe = addKeyframe(frame, value);

	selectedKeyframes.value = [keyframe];

	onKeyframeMousedown(ev, keyframe);
}

let beforeClickedAt = 0;

function onTlMousedown(ev: MouseEvent) {
	ev.preventDefault();
	tlEl.value.focus();

	if (ev.button === 1) {
		ev.preventDefault();
		const position = tlEl.value.getBoundingClientRect();
		const moveBaseX = ev.clientX - position.left;
		const moveBaseY = ev.clientY - position.top;
		const baseTlPosX = tlPosX.value;
		const baseTlPosY = tlPosY.value;

		function move(x: number, y: number) {
			tlPosX.value = baseTlPosX + (domXToLogicalX(moveBaseX) - domXToLogicalX(x));
			tlPosY.value = baseTlPosY + (domYToLogicalY(moveBaseY) - domYToLogicalY(y));
		}

		dragListen(me => {
			move(me.clientX - position.left, me.clientY - position.top);
		});
		return;
	}

	if (ev.button === 2) return;

	// ダブルクリック判定
	if (Date.now() - beforeClickedAt < 300) {
		beforeClickedAt = Date.now();
		onTlDblclick(ev);
		return;
	}

	beforeClickedAt = Date.now();

	selectedKeyframes.value = [];
	contextmenuKeyframe.value = null;

	const position = tlEl.value.getBoundingClientRect();
	const moveBaseX = ev.clientX - position.left;
	const moveBaseY = ev.clientY - position.top;

	function move(x: number, y: number) {
		const originFrame = domXToFrame(Math.min(moveBaseX, x));
		const targetFrame = domXToFrame(Math.max(moveBaseX, x));
		const originValue = domYToValue(Math.max(moveBaseY, y));
		const targetValue = domYToValue(Math.min(moveBaseY, y));
		selectedAreaPosX.value = originFrame;
		selectedAreaPosY.value = originValue;
		selectedAreaWidth.value = targetFrame - originFrame;
		selectedAreaHeight.value = targetValue - originValue;

		if (selectedAutomation.value) {
			selectedKeyframes.value = selectedAutomation.value.keyframes.filter(kf =>
				kf.frame >= originFrame && kf.frame <= targetFrame && kf.value >= originValue && kf.value <= targetValue
			);
		}
	}

	nowSelecting.value = true;
	dragListen(me => {
		move(me.clientX - position.left, me.clientY - position.top);
	}, () => {
		nowSelecting.value = false;
		selectedAreaPosX.value = 0;
		selectedAreaPosY.value = 0;
		selectedAreaWidth.value = 0;
		selectedAreaHeight.value = 0;
	});
}

const SNAP_THRESHOLD = 5;

function onKeyframesXYHandleMousedown(ev: MouseEvent, keyframe: GsKeyframe, treatX: boolean, treatY: boolean) {
	ev.stopPropagation();
	const prevKeyframe = selectedAutomation.value?.keyframes[selectedAutomation.value.keyframes.indexOf(selectedKeyframes.value[0]) - 1];
	const nextKeyframe = selectedAutomation.value?.keyframes[selectedAutomation.value.keyframes.indexOf(selectedKeyframes.value[selectedKeyframes.value.length - 1]) + 1];
	const position = tlEl.value.getBoundingClientRect();
	const moveBaseX = ev.clientX - position.left;
	const moveBaseY = ev.clientY - position.top;
	const baseFrame = keyframe.frame;
	const baseValue = keyframe.value;
	const baseFrames = selectedKeyframes.value.map(keyframe => keyframe.frame);
	const baseValues = selectedKeyframes.value.map(keyframe => keyframe.value);
	const firstFrameOffset = baseFrame - baseFrames[0];
	const lastFrameOffset = baseFrame - baseFrames[baseFrames.length - 1];

	function move(x: number, y: number) {
		const baseNewFrame = treatX ? Math.max((prevKeyframe?.frame ?? -Infinity) + firstFrameOffset, Math.min((nextKeyframe?.frame ?? Infinity) + lastFrameOffset, baseFrame + (domXToFrame(x) - domXToFrame(moveBaseX)))) : baseFrame;
		let baseNewValue = treatY ? baseValue + (domYToValue(y) - domYToValue(moveBaseY)) : baseValue;

		if (treatY) {
			snappingY.value = null;
			// snap
			for (const step of [...yTicksWithHalf.value, prevKeyframe?.value ?? 1, nextKeyframe?.value ?? 1, 1]) { // 1は重要なのでどんな時でもスナップ候補
				const stepY = valueToDomY(step);
				if (valueToDomY(baseValue) + (y - moveBaseY) > stepY - SNAP_THRESHOLD && valueToDomY(baseValue) + (y - moveBaseY) < stepY + SNAP_THRESHOLD) {
					baseNewValue = step;
					snappingY.value = step;
					break;
				}
			}

			// TODO: 比率を維持して制御点を再スケール
			//keyframe.bezierControlPointA[1] = ?
			//keyframe.bezierControlPointB[1] = ?
		}

		for (let i = 0; i < selectedKeyframes.value.length; i++) {
			const keyframe = selectedKeyframes.value[i];
			if (treatX) keyframe.frame = baseNewFrame + (baseFrames[i] - baseFrame);
			if (treatY) keyframe.value = baseNewValue + (baseValues[i] - baseValue);
		}
	}

	dragListen(me => {
		move(me.clientX - position.left, me.clientY - position.top);
	}, () => {
		snappingY.value = null;
	});
}

function onKeyframeXHandleMousedown(ev: MouseEvent) {
	ev.stopPropagation();
	onKeyframesXYHandleMousedown(ev, contextmenuKeyframe.value, true, false);
}

function onKeyframeYHandleMousedown(ev: MouseEvent) {
	ev.stopPropagation();
	onKeyframesXYHandleMousedown(ev, contextmenuKeyframe.value, false, true);
}

function onKeyframeMousedown(ev: MouseEvent, keyframe: GsKeyframe) {
	ev.stopPropagation();
	if (ev.button !== 0) return;

	if (selectedKeyframes.value.length === 0) {
		selectedKeyframes.value = [keyframe];
	} else if (!selectedKeyframes.value.includes(keyframe)) {
		selectedKeyframes.value = [keyframe];
	}

	onKeyframesXYHandleMousedown(ev, keyframe, true, true);
}

function onKeyframeContextmenu(ev: MouseEvent, keyframe: GsKeyframe) {
	ev.preventDefault();
	ev.stopPropagation();

	if (selectedKeyframes.value.length === 0) {
		selectedKeyframes.value = [keyframe];
	} else if (!selectedKeyframes.value.includes(keyframe)) {
		selectedKeyframes.value = [keyframe];
	}

	contextmenuKeyframe.value = keyframe;
}

const BEZIER_SNAP_THRESHOLD = 8;
const BEZIER_X_SNAP_STEPS = [0, 0.25, 0.5, 0.75, 1];
const BEZIER_Y_SNAP_STEPS = [-2, -1.5, -1, -0.5, 0, 0.5, 1];
function onBezierHandleAMousedown(ev: MouseEvent) {
	ev.stopPropagation();
	const keyframe = selectedAutomation.value.keyframes.find(kf => kf.id === selectedKeyframe.value.id)!;
	const prevKeyframe = selectedAutomation.value?.keyframes[selectedAutomation.value.keyframes.indexOf(selectedKeyframe.value) - 1];
	if (prevKeyframe == null) return;
	const position = tlEl.value.getBoundingClientRect();
	const moveBaseX = ev.clientX - position.left;
	const moveBaseY = ev.clientY - position.top;
	const baseFrame = keyframe.frame;
	const baseValue = keyframe.value;
	const baseControlPointX = keyframe.bezierControlPointA[0];
	const baseControlPointY = keyframe.bezierControlPointA[1];

	bezierSnapLinesX.value = BEZIER_X_SNAP_STEPS.map(step => ({
		x: frameToDomX(keyframe.frame - ((keyframe.frame - prevKeyframe.frame) * step)),
	}));
	bezierSnapLinesY.value = BEZIER_Y_SNAP_STEPS.map(step => ({
		x: frameToDomX(prevKeyframe.frame),
		y: valueToDomY(keyframe.value - ((prevKeyframe.value - keyframe.value) * step)),
		width: frameToDomX(keyframe.frame) - frameToDomX(prevKeyframe.frame),
	}));

	function move(x: number, y: number) {
		keyframe.bezierControlPointA = [
			Math.min(0, baseControlPointX + ((domXToLogicalX(x) - domXToLogicalX(moveBaseX)))),
			baseControlPointY + ((domYToLogicalY(y) - domYToLogicalY(moveBaseY))),
		];

		for (const line of bezierSnapLinesX.value) {
			line.active = false;
		}
		for (const line of bezierSnapLinesY.value) {
			line.active = false;
		}

		// snap
		const domX = bezierHandleADomPos.value[0];
		for (let i = 0; i < BEZIER_X_SNAP_STEPS.length; i++) {
			const step = BEZIER_X_SNAP_STEPS[i];
			const stepX = frameToDomX(baseFrame - ((baseFrame - prevKeyframe.frame) * step));
			if (domX > stepX - BEZIER_SNAP_THRESHOLD && domX < stepX + BEZIER_SNAP_THRESHOLD) {
				keyframe.bezierControlPointA[0] = 0 - ((baseFrame - prevKeyframe.frame) * step);
				bezierSnapLinesX.value[i].active = true;
				break;
			}
		}
		const domY = bezierHandleADomPos.value[1];
		for (let i = 0; i < BEZIER_Y_SNAP_STEPS.length; i++) {
			const step = BEZIER_Y_SNAP_STEPS[i];
			const stepY = valueToDomY(baseValue - ((prevKeyframe.value - baseValue) * step));
			if (domY > stepY - BEZIER_SNAP_THRESHOLD && domY < stepY + BEZIER_SNAP_THRESHOLD) {
				keyframe.bezierControlPointA[1] = (baseValue - prevKeyframe.value) * step;
				bezierSnapLinesY.value[i].active = true;
				break;
			}
		}
	}

	bezierDragging.value = true;

	dragListen(me => {
		move(me.clientX - position.left, me.clientY - position.top);
	}, () => {
		bezierDragging.value = false;
		bezierSnapLinesX.value = [];
		bezierSnapLinesY.value = [];
	});
}

function onBezierHandleBMousedown(ev: MouseEvent) {
	ev.stopPropagation();
	const keyframe = selectedAutomation.value.keyframes.find(kf => kf.id === selectedKeyframe.value.id)!;
	const nextKeyframe = selectedAutomation.value?.keyframes[selectedAutomation.value.keyframes.indexOf(selectedKeyframe.value) + 1];
	if (nextKeyframe == null) return;
	const position = tlEl.value.getBoundingClientRect();
	const moveBaseX = ev.clientX - position.left;
	const moveBaseY = ev.clientY - position.top;
	const baseFrame = keyframe.frame;
	const baseValue = keyframe.value;
	const baseControlPointX = keyframe.bezierControlPointB[0];
	const baseControlPointY = keyframe.bezierControlPointB[1];

	bezierSnapLinesX.value = BEZIER_X_SNAP_STEPS.map(step => ({
		x: frameToDomX(keyframe.frame - ((keyframe.frame - nextKeyframe.frame) * step)),
	}));
	bezierSnapLinesY.value = BEZIER_Y_SNAP_STEPS.map(step => ({
		x: frameToDomX(keyframe.frame),
		y: valueToDomY(keyframe.value - ((nextKeyframe.value - keyframe.value) * step)),
		width: frameToDomX(nextKeyframe.frame) - frameToDomX(keyframe.frame),
	}));

	function move(x: number, y: number) {
		keyframe.bezierControlPointB = [
			Math.max(0, baseControlPointX + ((domXToLogicalX(x) - domXToLogicalX(moveBaseX)))),
			baseControlPointY + ((domYToLogicalY(y) - domYToLogicalY(moveBaseY))),
		];

		for (const line of bezierSnapLinesX.value) {
			line.active = false;
		}
		for (const line of bezierSnapLinesY.value) {
			line.active = false;
		}

		// snap
		const domX = bezierHandleBDomPos.value[0];
		for (let i = 0; i < BEZIER_X_SNAP_STEPS.length; i++) {
			const step = BEZIER_X_SNAP_STEPS[i];
			const stepX = frameToDomX(baseFrame - ((baseFrame - nextKeyframe.frame) * step));
			if (domX > stepX - BEZIER_SNAP_THRESHOLD && domX < stepX + BEZIER_SNAP_THRESHOLD) {
				keyframe.bezierControlPointB[0] = 0 - ((baseFrame - nextKeyframe.frame) * step);
				bezierSnapLinesX.value[i].active = true;
				break;
			}
		}
		const domY = bezierHandleBDomPos.value[1];
		for (let i = 0; i < BEZIER_Y_SNAP_STEPS.length; i++) {
			const step = BEZIER_Y_SNAP_STEPS[i];
			const stepY = valueToDomY(baseValue - ((nextKeyframe.value - baseValue) * step));
			if (domY > stepY - BEZIER_SNAP_THRESHOLD && domY < stepY + BEZIER_SNAP_THRESHOLD) {
				keyframe.bezierControlPointB[1] = (baseValue - nextKeyframe.value) * step;
				bezierSnapLinesY.value[i].active = true;
				break;
			}
		}
	}

	bezierDragging.value = true;

	dragListen(me => {
		move(me.clientX - position.left, me.clientY - position.top);
	}, () => {
		bezierDragging.value = false;
		bezierSnapLinesX.value = [];
		bezierSnapLinesY.value = [];
	});
}

function onSeekBarMousedown(ev: MouseEvent) {
	ev.stopPropagation();
	const position = tlEl.value.getBoundingClientRect();

	function move(x: number, y: number) {
		frame.value = domXToFrame(x);
	}

	dragListen(me => {
		move(me.clientX - position.left, me.clientY - position.top);
	});
}

function deleteKeyframe(keyframe: GsKeyframe) {
	const automation = selectedAutomation.value;
	if (!automation) return;
	const index = automation.keyframes.indexOf(keyframe);
	if (index === -1) return;
	automation.keyframes.splice(index, 1);
}

let copyingKeyframes = null;
function onTlKeydown(ev: KeyboardEvent) {
	console.log(ev.key, ev.ctrlKey);
	if (ev.key === 'Backspace') {
		const kfs = selectedKeyframes.value;
		selectedKeyframes.value = [];
		contextmenuKeyframe.value = null;
		for (const kf of kfs) {
			deleteKeyframe(kf);
		}
	} else if (ev.ctrlKey && ev.key === 'c') {
		copyingKeyframes = JSON.parse(JSON.stringify(selectedKeyframes.value));
	} else if (ev.ctrlKey && ev.key === 'v') {
		if (copyingKeyframes == null) return;
		if (selectedAutomation.value == null) return;
		const baseFrame = copyingKeyframes[0].frame;
		for (const kf of copyingKeyframes) {
			addKeyframe(cursorFrame.value + (kf.frame - baseFrame), kf.value);
		}
	}
}

function toggleBezierA() {
	if (selectedKeyframe.value == null) return;
	if (isBezierAZero.value) {
		selectedKeyframe.value.bezierControlPointA = [-10, 0];
	} else {
		selectedKeyframe.value.bezierControlPointA = [0, 0];
	}
}

function toggleBezierB() {
	if (selectedKeyframe.value == null) return;
	if (isBezierBZero.value) {
		selectedKeyframe.value.bezierControlPointB = [10, 0];
	} else {
		selectedKeyframe.value.bezierControlPointB = [0, 0];
	}
}

onMounted(() => {
	tlElWidth.value = tlEl.value.offsetWidth;
	tlElHeight.value = tlEl.value.offsetHeight;

	const resizeObserver = new ResizeObserver(() => {
		tlElWidth.value = tlEl.value.offsetWidth;
		tlElHeight.value = tlEl.value.offsetHeight;
	});

	resizeObserver.observe(tlEl.value);
});
</script>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	height: 100%;
	contain: content;

	--xTicksHeight: v-bind('X_TICKS_HEIGHT + "px"');
	--yTicksWidth: v-bind('Y_TICKS_WIDTH + "px"');
}

.header {
	display: flex;
	height: 32px;
	line-height: 32px;
}
.frameCount {
	font-size: 18px;
}

.body {
	flex: 1;
	display: flex;
}

.side {
	box-sizing: border-box;
	width: 300px;
	padding: 16px;
	background: #181818;
}

.yTicks {
	position: absolute;
	z-index: 1000;
	top: 0;
	left: 0;
	height: 100%;
	width: var(--yTicksWidth);
	background: #181818aa;
	backdrop-filter: blur(24px);
	overflow: clip;
	contain: content;
}
.yTick {
	position: absolute;
	left: 0;
	width: 100%;
	font-size: 12px;
	padding: 4px 8px 0 0;
	box-sizing: border-box;
	border-top: solid 1px #fff1;
	text-align: right;
}
.yTickActive {
	border-top: solid 1px var(--accentAlphaMiddle);
}

.xTicks {
	position: absolute;
	z-index: 1000;
	top: 0;
	left: 0;
	width: 100%;
	height: var(--xTicksHeight);
	background: #181818aa;
	backdrop-filter: blur(24px);
	overflow: clip;
	contain: content;
}
.xTick {
	position: absolute;
	top: 0;
	height: 100%;
	font-size: 12px;
	padding: 0 0 0 8px;
	border-left: solid 1px #fff3;
}

.ticksCorner {
	position: absolute;
	z-index: 1000;
	top: 0;
	left: 0;
	width: var(--yTicksWidth);
	height: var(--xTicksHeight);
	background: #181818;
}

.tl {
	position: relative;
	flex: 1;
	overflow: clip;
	background-size: auto auto;
	background-color: #2d2d2d;
	background-image: repeating-linear-gradient(45deg, transparent, transparent 6px, #222222 6px, #222222 12px );
	contain: content;

	&:focus {
		outline: none;
		//outline: solid 7px #fff;
	}
}

.lines {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	color: var(--accent);
}

.inTlXTick {
	position: absolute;
	top: 0;
	height: 100%;
	border-left: dotted 1px #fff1;
	pointer-events: none;
}
.inTlXTickZero {
	border-left: solid 1px #fff2;
}

.inTlYTick {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	border-top: dotted 1px #fff1;
	pointer-events: none;
}
.inTlYTickZero {
	border-top: solid 1px #fff2;
}
.inTlYTickActive {
	border-top: solid 1px var(--accentAlphaMiddle);
}

.xTicksSeekBar {
	position: absolute;
	top: 0;
	height: 100%;
	width: 3px;
	background: #FF5500;
	cursor: ew-resize;
	will-change: left;

	&::before {
		content: "";
		display: block;
		position: absolute;
		top: 0;
		left: -7px;
    width: 16px;
		height: 100%;
	}
}

.seekBar {
	position: absolute;
	top: var(--xTicksHeight);
	height: calc(100% - var(--xTicksHeight));
	width: 1px;
	background: #FF5500;
	pointer-events: none;
	will-change: left;

	&::before {
		content: "";
		display: block;
		position: absolute;
		top: 0;
		right: 0;
		width: 32px;
		height: 100%;
		background: linear-gradient(270deg, #FF550055, #FF550000);
	}
}
.seekBarFrame {
	display: inline-block;
	background: #FF5500;
	color: #fff;
	min-width: 40px;
}

.valueBar {
	position: absolute;
	left: var(--yTicksWidth);
	width: calc(100% - var(--yTicksWidth));
	height: 1px;
	background: #FF5500;
	pointer-events: none;
	will-change: top;
}
.valueBarValue {
	display: inline-block;
	background: #FF5500;
	color: #fff;
	min-width: 40px;
}

.crossPoint {
	position: absolute;
	z-index: 10;
	width: 9px;
	height: 9px;
	margin-left: -4px;
	margin-top: -4px;
	border-radius: 100%;
	background: #FF5500;
	pointer-events: none;
	will-change: top, left;
}

.cursorBar {
	position: absolute;
	top: 0;
	height: 100%;
	width: 1px;
	background: #fff1;
}

.automation {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
}

@keyframes blink {
	0% { opacity: 1; transform: scale(1); }
	30% { opacity: 1; transform: scale(1); }
	90% { opacity: 0; transform: scale(0.5); }
}

.keyframe {
	position: absolute;
	z-index: 1;
	cursor: pointer;
	display: block;
	position: absolute;
	margin-top: -7px;
	margin-left: -7px;
	width: 14px;
	height: 14px;
	background: transparent;
	border-radius: 100%;

	&::before {
		content: "";
		display: block;
		position: absolute;
		top: 2px;
		left: 2px;
		width: 11px;
		height: 11px;
		background: var(--accent);
		border-radius: 100%;
		pointer-events: none;
	}

	&.selectedKeyframe {
		&::before {
			background: #fff;
		}

		&::after {
			content: "";
			display: block;
			position: absolute;
			top: 2px;
			left: 2px;
			width: 10px;
			height: 10px;
			background: transparent;
			border-radius: 100%;
			outline: solid 1px var(--accentAlphaMiddle);
			outline-offset: 4px;
			animation: blink 1s infinite;
			pointer-events: none;
		}
	}
}

.tlRange {
	position: absolute;
	top: 0;
	background: #222;
	height: 100%;
}

.selectedArea {
	position: absolute;
	background: #fff1;
}

.tooltip {
	position: absolute;
	background: #0005;
	color: #fff;
	padding: 6px 10px;
	font-size: 13px;
}

.keyframeContextmenu {
	position: absolute;
	background: #0005;
	color: #fff;
	font-size: 13px;

	> div {
		display: flex;
		line-height: 24px;

		&:not(:first-child) {
			border-top: solid 1px #fff2;
		}
	}
}

.keyframeContextmenuHandle {
	width: 24px;
	height: 24px;
	text-align: center;
}

.keyframeContextmenuInput {
	padding: 0 4px;
}

.bezierHandle {
	position: absolute;
	cursor: move;
	margin-top: -10px;
	margin-left: -10px;
	width: 20px;
	height: 20px;
	border-radius: 100%;

	&::before {
		content: "";
		display: block;
		position: absolute;
		top: 5px;
		left: 5px;
		width: 10px;
		height: 10px;
		background: #00f3ff;
		border-radius: 100%;
		pointer-events: none;
	}
}

.bezierSnapLineX {
	position: absolute;
	top: 0;
	width: 1px;
	height: 100%;
	background: var(--accentAlphaLow);
	pointer-events: none;

	&.bezierSnapLineXActive {
		background: var(--accentAlphaMiddle);
	}
}

.bezierSnapLineY {
	position: absolute;
	height: 1px;
	background: var(--accentAlphaLow);
	pointer-events: none;

	&.bezierSnapLineYActive {
		background: var(--accentAlphaMiddle);
	}
}

.infoBar {
	display: flex;
	position: absolute;
	bottom: 0;
	left: var(--yTicksWidth);
	box-sizing: border-box;
	padding: 0 8px;
	width: calc(100% - var(--yTicksWidth));
	height: 22px;
	line-height: 22px;
	font-size: 13px;
	background: #0008;
	color: #fff;
	overflow: clip;
	contain: strict;
	pointer-events: none;

	> div {
		flex: 1;

		> b {
			margin-right: 1em;
			font-weight: normal;
			opacity: 0.7;

			&:after {
				content: ':';
			}
		}

		> code {
			display: inline-block;
			min-width: 4em;
		}
	}
}

.rightSidePanel {
	position: absolute;
	top: 0;
	right: 0;
	box-sizing: border-box;
	padding: 18px;
	width: 300px;
	height: 100%;
	background: #0008;
	backdrop-filter: blur(4px);
	color: #fff;
}
</style>
