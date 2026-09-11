<template>
<div ref="root" :class="[$style.root, { [$style.horizontal]: divider.direction === 'horizontal', [$style.vertical]: divider.direction === 'vertical' }]">
	<template v-for="(child, i) in divider.children" :key="child.id">
		<GsWorkspaceDivider
			v-if="child.type === null"
			:divider="child"
			:class="$style.child"
			:style="{ flexGrow: child.ratio / totalRatio }"
		/>
		<component
			:is="panelComponents[child.type]"
			v-else
			:ref="child.id"
			:key="child.id"
			:panel="child"
			:class="$style.child"
			:style="{ flexGrow: child.ratio / totalRatio }"
		/>
		<div
			v-if="i < divider.children.length - 1"
			:class="$style.handle"
			@pointerdown.prevent="onPointerDown($event, i)"
			@pointermove="onPointerMove"
			@pointerup="onPointerEnd"
			@pointercancel="onPointerEnd"
		></div>
	</template>
</div>
</template>

<script lang="ts" setup>
import { computed, useTemplateRef } from 'vue';
import type { WorkspaceDivider } from '@/types/workspace.ts';
import XEmpty from '@/components/GsWorkspacePanel.Empty.vue';
import XPreview from '@/components/GsWorkspacePanel.Preview.vue';
import XNodesEditor from '@/components/GsWorkspacePanel.NodesEditor.vue';
import XHistogram from '@/components/GsWorkspacePanel.Histogram.vue';
import XWaveform from '@/components/GsWorkspacePanel.Waveform.vue';
import XAudioSpectrum from '@/components/GsWorkspacePanel.AudioSpectrum.vue';
import XAudioSpectrogram from '@/components/GsWorkspacePanel.AudioSpectrogram.vue';
import XAudioWaveform from '@/components/GsWorkspacePanel.AudioWaveform.vue';
import XStats from '@/components/GsWorkspacePanel.Stats.vue';
import XCommandLog from '@/components/GsWorkspacePanel.CommandLog.vue';
import XMacros from '@/components/GsWorkspacePanel.Macros.vue';
import XPlayers from '@/components/GsWorkspacePanel.Players.vue';

const panelComponents = {
	empty: XEmpty,
	preview: XPreview,
	nodesEditor: XNodesEditor,
	histogram: XHistogram,
	waveform: XWaveform,
	audioSpectrum: XAudioSpectrum,
	audioSpectrogram: XAudioSpectrogram,
	audioWaveform: XAudioWaveform,
	stats: XStats,
	commandLog: XCommandLog,
	macros: XMacros,
	players: XPlayers,
};

const props = withDefaults(defineProps<{
	divider: WorkspaceDivider;
}>(), {

});

const root = useTemplateRef('root');

// flex-grow の合計が 1 未満だと余白が残るため、兄弟間で正規化
const totalRatio = computed(() => props.divider.children.reduce((total, child) => total + child.ratio, 0));

const handleSize = 5;
const minPanelSize = 32;

let dragState: {
	pointerId: number;
	target: HTMLElement;
	startPosition: number;
	startRatio: number;
	pairRatio: number;
	totalRatio: number;
	availableSize: number;
	before: WorkspaceDivider['children'][number];
	after: WorkspaceDivider['children'][number];
} | null = null;

function onPointerDown(ev: PointerEvent, index: number) {
	if (ev.button !== 0 || root.value == null || !(ev.currentTarget instanceof HTMLElement)) return;

	const before = props.divider.children[index];
	const after = props.divider.children[index + 1];
	const rect = root.value.getBoundingClientRect();
	const size = props.divider.direction === 'horizontal' ? rect.width : rect.height;
	const availableSize = size - handleSize * (props.divider.children.length - 1);
	const totalRatio = props.divider.children.reduce((total, child) => total + child.ratio, 0);

	if (availableSize <= 0 || totalRatio <= 0) return;

	dragState = {
		pointerId: ev.pointerId,
		target: ev.currentTarget,
		startPosition: props.divider.direction === 'horizontal' ? ev.clientX : ev.clientY,
		startRatio: before.ratio,
		pairRatio: before.ratio + after.ratio,
		totalRatio,
		availableSize,
		before,
		after,
	};

	ev.currentTarget.setPointerCapture(ev.pointerId);
}

function onPointerMove(ev: PointerEvent) {
	if (dragState == null || ev.pointerId !== dragState.pointerId) return;

	const position = props.divider.direction === 'horizontal' ? ev.clientX : ev.clientY;
	const deltaRatio = (position - dragState.startPosition) / dragState.availableSize * dragState.totalRatio;
	const minRatio = Math.min(minPanelSize / dragState.availableSize * dragState.totalRatio, dragState.pairRatio / 2);
	const beforeRatio = Math.min(
		dragState.pairRatio - minRatio,
		Math.max(minRatio, dragState.startRatio + deltaRatio),
	);

	dragState.before.ratio = beforeRatio;
	dragState.after.ratio = dragState.pairRatio - beforeRatio;
}

function onPointerEnd(ev: PointerEvent) {
	if (dragState == null || ev.pointerId !== dragState.pointerId) return;

	const { target, pointerId } = dragState;
	dragState = null;
	if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
}

</script>

<style module lang="scss">
.root {
	display: flex;
	min-width: 0;
	min-height: 0;
}

.child {
	flex-basis: 0;
	min-width: 0;
	min-height: 0;
}

.handle {
	flex: 0 0 5px;
	touch-action: none;
}

.horizontal {
	flex-direction: row;

	> .handle {
		cursor: col-resize;
	}
}

.vertical {
	flex-direction: column;

	> .handle {
		cursor: row-resize;
	}
}

</style>
