<template>
<div class="stats-component _gs-container">
	<div class="legend">
		<div v-for="item in series" :key="item.key">
			<span class="swatch" :style="{ backgroundColor: item.color }"></span>
			<span class="name">{{ item.label }}</span>
			<strong>{{ formatMs(current[item.key]) }}</strong>
		</div>
	</div>
	<div class="chart">
		<svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" role="img" :aria-label="i18n.ts.FrameRenderTimesLast30Seconds">
			<g class="grid">
				<template v-for="tick in yTicks" :key="tick.value">
					<line :x1="plotLeft" :x2="chartWidth - plotRight" :y1="tick.y" :y2="tick.y"/>
					<text :x="plotLeft - 8" :y="tick.y + 4" text-anchor="end">{{ tick.value.toFixed(0) }}</text>
				</template>
				<template v-for="tick in xTicks" :key="tick.label">
					<line :x1="tick.x" :x2="tick.x" :y1="plotTop" :y2="chartHeight - plotBottom"/>
					<text :x="tick.x" :y="chartHeight - 8" :text-anchor="tick.anchor">{{ tick.label }}</text>
				</template>
				<text x="8" y="14">ms</text>
			</g>
			<polyline
				v-for="item in series"
				:key="item.key"
				:points="polylinePoints(item.key)"
				:stroke="item.color"
				fill="none"
				stroke-width="2"
				stroke-linejoin="round"
				vector-effect="non-scaling-stroke"
			/>
		</svg>
	</div>
</div>
</template>

<script lang="ts" setup>
import type { Engine } from '@/engine/engine.ts';
import { i18n } from '@/i18n.ts';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{
	engine: Engine;
}>();

type SeriesKey = 'fast' | 'medium' | 'slow';
type RenderTimes = Record<SeriesKey, number>;
type Sample = RenderTimes & { timestamp: number };

const sampleInterval = 100;
const historyDuration = 30_000;
const sampleLimit = historyDuration / sampleInterval;
const chartWidth = 640;
const chartHeight = 320;
const plotLeft = 44;
const plotRight = 12;
const plotTop = 18;
const plotBottom = 28;
const plotWidth = chartWidth - plotLeft - plotRight;
const plotHeight = chartHeight - plotTop - plotBottom;

const series = [
	{ key: 'fast', label: 'fast', color: '#c2fe0c' },
	{ key: 'medium', label: 'medium', color: '#55c8ff' },
	{ key: 'slow', label: 'slow', color: '#c98cff' },
] as const;

const samples = ref<Sample[]>([]);
const current = ref<RenderTimes>({ fast: 0, medium: 0, slow: 0 });
const maxMs = computed(() => Math.max(4, Math.ceil(Math.max(...samples.value.flatMap(sample => series.map(item => sample[item.key]))) / 4) * 4));
const yTicks = computed(() => Array.from({ length: 5 }, (_, index) => {
	const value = maxMs.value * (4 - index) / 4;
	return { value, y: plotTop + (index / 4) * plotHeight };
}));
const xTicks = [
	{ x: plotLeft, label: '-30s', anchor: 'start' as const },
	{ x: plotLeft + plotWidth / 3, label: '-20s', anchor: 'middle' as const },
	{ x: plotLeft + plotWidth * 2 / 3, label: '-10s', anchor: 'middle' as const },
	{ x: chartWidth - plotRight, label: i18n.t('Now'), anchor: 'end' as const },
];

let timer: number | undefined;

function recordSample() {
	const timestamp = performance.now();
	current.value = {
		fast: toMs(props.engine.gpuAverageDisplayFast.value),
		medium: toMs(props.engine.gpuAverageDisplayMedium.value),
		slow: toMs(props.engine.gpuAverageDisplaySlow.value),
	};
	samples.value.push({ ...current.value, timestamp });
	while (samples.value[0]?.timestamp < timestamp - historyDuration || samples.value.length > sampleLimit) samples.value.shift();
}

function polylinePoints(key: SeriesKey) {
	const latestTimestamp = samples.value.at(-1)?.timestamp ?? 0;
	return samples.value.map(sample => {
		const x = plotLeft + (1 - (latestTimestamp - sample.timestamp) / historyDuration) * plotWidth;
		const y = plotTop + (1 - sample[key] / maxMs.value) * plotHeight;
		return `${x},${y}`;
	}).join(' ');
}

function formatMs(value: number) {
	return `${value.toFixed(1)}ms`;
}

function toMs(value: number) {
	return Number.isFinite(value) && value >= 0 ? value / 1000 : 0;
}

onMounted(() => {
	recordSample();
	timer = window.setInterval(recordSample, sampleInterval);
});

onBeforeUnmount(() => {
	if (timer != null) window.clearInterval(timer);
});
</script>

<style scoped lang="scss">
.stats-component {
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	height: 100%;
	min-height: 0;
	padding: 12px;
}

.legend {
	display: flex;
	flex-wrap: wrap;
	gap: 10px 20px;
	padding: 2px 4px 12px;
	font-size: 12px;

	> div {
		display: grid;
		grid-template-columns: 8px auto 5em;
		align-items: center;
		gap: 6px;
	}

	.swatch {
		width: 8px;
		height: 2px;
	}

	.name {
		opacity: 0.7;
	}

	strong {
		text-align: right;
		font-weight: 600;
	}
}

.chart {
	flex: 1;
	min-height: 220px;
	border: solid 1px rgba(255, 255, 255, 0.08);
	border-radius: 4px;
	background: #151515;
	box-shadow: 0 2px 2px rgba(0, 0, 0, 0.5) inset;
	overflow: hidden;

	> svg {
		display: block;
		width: 100%;
		height: 100%;
	}
}

.grid {
	line {
		stroke: rgba(255, 255, 255, 0.09);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}

	text {
		fill: rgba(255, 255, 255, 0.45);
		font-family: inherit;
		font-size: 11px;
	}
}
</style>
