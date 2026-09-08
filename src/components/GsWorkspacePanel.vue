<template>
<div
	class="_forceShrinkSpacer"
	:class="[$style.root, { [$style.active]: active, [$style.draghover]: draghover, [$style.dragging]: dragging, [$style.dropready]: dropready }]"
	@dragover.prevent.stop="onDragover"
	@dragleave="onDragleave"
	@drop.prevent.stop="onDrop"
>
	<header
		:class="[$style.header]"
		draggable="true"
		@click="goTop"
		@dragstart="onDragstart"
		@dragend="onDragend"
		@contextmenu.prevent.stop="onContextmenu"
		@wheel.passive="emit('headerWheel', $event)"
	>
		<svg viewBox="0 0 256 128" :class="$style.tabShape">
			<g transform="matrix(6.2431,0,0,6.2431,-677.417,-29.3839)">
				<path d="M149.512,4.707L108.507,4.707C116.252,4.719 118.758,14.958 118.758,14.958C118.758,14.958 121.381,25.283 129.009,25.209L149.512,25.209L149.512,4.707Z" style="fill:var(--THEME-bg);"/>
			</g>
		</svg>
		<div :class="$style.color"></div>
		<button v-if="isStacked" :class="$style.toggleActive" class="_button" @click="toggleActive">
			<template v-if="active"><i class="ti ti-chevron-up"></i></template>
			<template v-else><i class="ti ti-chevron-down"></i></template>
		</button>
		<span :class="$style.title"><slot name="header"></slot></span>
		<svg viewBox="0 0 16 16" version="1.1" :class="$style.grabber">
			<path fill="currentColor" d="M10 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm-4 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm5-9a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>
		</svg>
		<button :class="$style.menu" class="_button" @click.stop="showSettingsMenu"><i class="ti ti-dots"></i></button>
	</header>
	<div v-if="active" ref="body" :class="$style.body">
		<slot></slot>
	</div>
</div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, provide, watch, useTemplateRef, ref, computed } from 'vue';
import type { MenuItem } from '@/types/menu.js';
import * as ui from '@/ui.js';
import { i18n } from '@/i18n.js';
import { WorkspaceDivider, WorkspacePanel } from '@/types/workspace.ts';
import { appContext } from '@/app.ts';
import { genId } from '@/utility/id.ts';
//import { checkDragDataType, getDragData, setDragData } from '@/drag-and-drop.js';

const props = withDefaults(defineProps<{
	panel: WorkspacePanel;
	isStacked?: boolean;
	handleScrollToTop?: boolean;
	menu?: MenuItem[];
}>(), {
	isStacked: false,
	handleScrollToTop: true,
});

const emit = defineEmits<{
	(ev: 'headerWheel', ctx: WheelEvent): void;
	(ev: 'headerClick', ctx: MouseEvent): void;
}>();

const body = useTemplateRef('body');

const dragging = ref(false);
//watch(dragging, v => deckGlobalEvents.emit(v ? 'column.dragStart' : 'column.dragEnd'));

const draghover = ref(false);
const dropready = ref(false);

const active = computed(() => props.panel.active !== false);

/*
onMounted(() => {
	deckGlobalEvents.on('column.dragStart', onOtherDragStart);
	deckGlobalEvents.on('column.dragEnd', onOtherDragEnd);
});

onBeforeUnmount(() => {
	deckGlobalEvents.off('column.dragStart', onOtherDragStart);
	deckGlobalEvents.off('column.dragEnd', onOtherDragEnd);
});
*/

function onOtherDragStart() {
	dropready.value = true;
}

function onOtherDragEnd() {
	dropready.value = false;
}

function toggleActive() {
}

function findParent(id: string, divider = appContext.workspaceDefinition.value): WorkspaceDivider | undefined {
	for (const child of divider.children) {
		if (child.id === id) return divider;
		if (child.type === null) {
			const parent = findParent(id, child);
			if (parent) return parent;
		}
	}
}

// below/aboveかつ親のdirectionがverticalの場合、親のchildrenの自身の位置の下/上にempty typeのWorkspacePanelを追加
// below/aboveかつ親のdirectionがhorizontalの場合、親のchildrenの自身の位置に新しいdivider(vertical)を追加し、そのdividerに自身を移動・empty typeのWorkspacePanelを追。
// left/rightかつ親のdirectionがverticalの場合、親のchildrenの自身の位置に新しいdivider(horizontal)を追加し、そのdividerに自身を移動・empty typeのWorkspacePanelを追加
// left/rightかつ親のdirectionがhorizontalの場合、親のchildrenの自身の位置の左/右にempty typeのWorkspacePanelを追加
function addPanel(position: 'below' | 'above' | 'left' | 'right') {
	const parent = findParent(props.panel.id);
	if (!parent) return;

	const index = parent.children.findIndex(child => child.id === props.panel.id);
	const direction = position === 'below' || position === 'above' ? 'vertical' : 'horizontal';
	const before = position === 'above' || position === 'left';
	const panel: WorkspacePanel = { id: genId(), type: 'empty', ratio: props.panel.ratio };

	if (parent.direction === direction) {
		props.panel.ratio /= 2;
		panel.ratio = props.panel.ratio;
		parent.children.splice(index + (before ? 0 : 1), 0, panel);
	} else {
		parent.children.splice(index, 1, {
			id: genId(),
			type: null,
			ratio: props.panel.ratio,
			direction,
			children: before ? [panel, props.panel] : [props.panel, panel],
		});
	}
}

// closeしたとき、親のdividerのchildrenが1つのpanelのみになった場合、dividerは不要なので親のdividerを削除し、children内にあったその1つのpanelを、削除した親のdividerが入っていたchildren内に移動
function closePanel() {
	const parent = findParent(props.panel.id);
	if (!parent) return;

	const index = parent.children.findIndex(child => child.id === props.panel.id);
	parent.children.splice(index, 1);
	if (parent.children.length !== 1) return;

	const grandparent = findParent(parent.id);
	if (!grandparent) return;

	const remaining = parent.children[0];
	remaining.ratio = parent.ratio;
	grandparent.children.splice(grandparent.children.findIndex(child => child.id === parent.id), 1, remaining);
}

function getMenu() {
	const menuItems: MenuItem[] = [];

	if (props.menu) {
		menuItems.push(...props.menu);
	}

	if (menuItems.length > 0) {
		menuItems.push({
			type: 'divider',
		});
	}

	menuItems.push({
		icon: 'ti ti-box-align-bottom',
		text: 'Add panel to below',
		action: () => addPanel('below'),
	}, {
		icon: 'ti ti-box-align-top',
		text: 'Add panel to above',
		action: () => addPanel('above'),
	}, {
		icon: 'ti ti-box-align-left',
		text: 'Add panel to left',
		action: () => addPanel('left'),
	}, {
		icon: 'ti ti-box-align-right',
		text: 'Add panel to right',
		action: () => addPanel('right'),
	});

	menuItems.push({ type: 'divider' }, {
		icon: 'ti ti-x',
		text: 'Close panel',
		danger: true,
		action: closePanel,
	});

	return menuItems;
}

function showSettingsMenu(ev: PointerEvent) {
	ui.popupMenu(getMenu(), ev.currentTarget ?? ev.target);
}

function onContextmenu(ev: PointerEvent) {
	ui.contextMenu(getMenu(), ev);
}

function goTop(ev: PointerEvent) {
	emit('headerClick', ev);
	if (!props.handleScrollToTop) return;

	if (body.value) {
		body.value.scrollTo({
			top: 0,
			behavior: 'smooth',
		});
	}
}

function onDragstart(ev: DragEvent) {
	if (ev.dataTransfer == null) return;

	ev.dataTransfer.effectAllowed = 'move';
	setDragData(ev, 'deckColumn', props.panel.id);

	// Chromeのバグで、Dragstartハンドラ内ですぐにDOMを変更する(=リアクティブなプロパティを変更する)とDragが終了してしまう
	// SEE: https://stackoverflow.com/questions/19639969/html5-dragend-event-firing-immediately
	window.setTimeout(() => {
		dragging.value = true;
	}, 10);
}

function onDragend(ev: DragEvent) {
	dragging.value = false;
}

function onDragover(ev: DragEvent) {
	if (ev.dataTransfer == null) return;

	// 自分自身がドラッグされている場合
	if (dragging.value) {
		// 自分自身にはドロップさせない
		ev.dataTransfer.dropEffect = 'none';
	} else {
		const isDeckColumn = checkDragDataType(ev, ['deckColumn']);

		ev.dataTransfer.dropEffect = isDeckColumn ? 'move' : 'none';

		if (isDeckColumn) draghover.value = true;
	}
}

function onDragleave() {
	draghover.value = false;
}

function onDrop(ev: DragEvent) {
	draghover.value = false;
	deckGlobalEvents.emit('column.dragEnd');

	const id = getDragData(ev, 'deckColumn');
	if (id != null) {
		swapColumn(props.panel.id, id);
	}
}
</script>

<style lang="scss" module>
.root {
	--root-margin: 10px;
	--headerHeight: 32px;

	height: 100%;
	overflow: clip;
	contain: strict;
	border-radius: 10px;

	&.draghover {
		&::after {
			content: "";
			display: block;
			position: absolute;
			z-index: 1000;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: var(--THEME-focus);
		}
	}

	&.dragging {
		&::after {
			content: "";
			display: block;
			position: absolute;
			z-index: 1000;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: var(--THEME-focus);
			opacity: 0.5;
		}
	}

	&.dropready {
		* {
			pointer-events: none;
		}
	}

	&:not(.active) {
		flex-basis: var(--headerHeight);
		min-height: var(--headerHeight);
		border-bottom-right-radius: 0;
	}
}

.header {
	position: relative;
	display: flex;
	z-index: 2;
	line-height: var(--headerHeight);
	height: var(--headerHeight);
	padding: 0 16px 0 30px;
	font-size: 85%;
	background: var(--THEME-workspacePanelHeader);
	user-select: none;
}

.color {
	position: absolute;
	top: 12px;
	left: 12px;
	width: 3px;
	height: calc(100% - 24px);
	background: var(--THEME-accent);
	border-radius: 999px;
}

.tabShape {
	position: absolute;
	top: 0;
	right: -8px;
	width: auto;
	height: calc(100% - 6px);
}

.title {
	display: inline-block;
	align-items: center;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	width: 100%;
}

.toggleActive,
.menu {
	z-index: 1;
	width: var(--headerHeight);
	line-height: var(--headerHeight);
}

.toggleActive {
	margin-left: -16px;
}

.grabber {
	margin-left: auto;
	margin-right: 10px;
	padding: 8px 8px;
	box-sizing: border-box;
	height: var(--headerHeight);
	cursor: move;
	user-select: none;
	opacity: 0.5;
}

.menu {
	margin-right: -16px;
}

.body {
	height: calc(100% - var(--headerHeight));
	overflow: clip;
	box-sizing: border-box;
	container-type: size;
	background-color: var(--THEME-workspacePanelBody);
}
</style>
