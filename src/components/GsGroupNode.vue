<template>
<div :class="$style.root">
	<div ref="allInPortEl" :class="$style.allInPort">・</div>
	<header class="drag-handle" :class="$style.header" @dblclick="expanded = !expanded">Group: {{ node.name }}</header>
	<div :class="[$style.indicator, { [$style.active]: node.isEnabled, [$style.processing]: subStore.processingFxId === node.id }]"></div>
	<div :class="$style.buttons">
		<GsButton :class="$style.headerButton" @click="expanded = !expanded"><i class="ti" :class="expanded ? 'ti-chevron-up' : 'ti-chevron-down'"></i></GsButton>
		<GsButton :class="$style.headerButton" @click="showSettings = !showSettings"><i class="ti ti-settings"></i></GsButton>
		<GsButton :class="$style.headerButton" :title="i18n.ts.RemoveEffect" @click="remove()"><i class="ti ti-x"></i></GsButton>
	</div>

	<div v-if="showSettings" v-show="expanded" :class="$style.settings" class="_gaps_s">
		<button @click="exportPreset">Export as preset</button>
		<input type="text" :value="node.name" @change="changeName($event.target.value)"/>
		<button @click="addMacro">Add macro</button>
		<GsMacroEditor v-for="macro in node.macros" :key="macro.id" :class="$style.macroEditor" :macro="macro" :group="node"/>
	</div>

	<div v-show="expanded" :class="$style.params">
		<div v-for="macro in Object.values(node.macros)" :key="macro.id" :class="$style.param">
			<label :class="[$style.paramLabel, { [$style.expression]: isExpression(macro) }]" @dblclick="toggleMacroValueType(macro.id)">{{ macro.label }}</label>
			<div v-if="isExpression(macro)" :class="$style.paramBody">
				<input type="text" :class="$style.expression" :value="macro.value.value" @change="updateMacroAsExpression(macro.id, $event.target.value)"/>
			</div>
			<GsEffectParamControl v-else :class="$style.paramBody" :type="macro.type" :node="node" :group="group" :options="macro.typeOptions" :value="macro.value.value" @input="updateMacroAsLiteral(macro.id, $event)" @changeContinuous="updateMacroAsLiteral(macro.id, $event)"/>
		</div>
	</div>

	<div v-show="expanded" :class="$style.nodes">
		<GsButton @click="add"><i class="ti ti-plus"></i></GsButton>
		<GsNodes :group="node"/>
	</div>

	<div :class="$style.footer">
		<div ref="outPortEl" :class="$style.port">・</div>
		<code :class="$style.nodeId">{{ node.id }}</code>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, onMounted, shallowRef } from 'vue';
import GsNodes from './GsNodes.vue';
import GsEffectParamControl from './GsEffectParamControl.vue';
import GsMacroEditor from './GsMacroEditor.vue';
import GsButton from './common/GsButton.vue';
import { subStore } from '@/sub-store';
import { i18n } from '@/i18n';
import { Asset, Macro } from '@/types';
import { genId } from '@/utility/id.ts';
import { version } from '@/version';
import { appContext, showAddNodeMenu, wireMap } from '@/app';
import * as api from '@/api.js';
import { GsGroupNode } from '@/engine/renderer.ts';

const props = defineProps<{
	node: GsGroupNode,
	group: GsGroupNode,
}>();

const expanded = ref(true);
const showSettings = ref(false);
const outPortEl = shallowRef<HTMLElement>();
const allInPortEl = shallowRef<HTMLElement>();

function add(ev) {
	showAddNodeMenu(ev, props.node);
}

/*
this.$root.$on('expandAllFx', () => {
			this.expanded = true;
		});

		this.$root.$on('collapseAllFx', () => {
			this.expanded = false;
		});
*/

function addMacro() {
	appContext.commit('addMacro', {
		id: genId(),
		groupId: props.node.id,
	});
}

function isExpression(macro: Macro) {
	return macro.value.type === 'expression';
}

function changeName(name: string) {
	appContext.commit('updateGroupName', {
		nodeId: props.node.id,
		name,
	});
}

function updateMacroAsLiteral(id: string, value: any) {
	appContext.commit('updateMacroAsLiteral', {
		macroId: id,
		value: value,
		groupId: props.node.id,
	});
}

function updateMacroAsExpression(id: string, value: string) {
	appContext.commit('updateMacroAsExpression', {
		macroId: id,
		value: value,
		groupId: props.node.id,
	});
}

function toggleMacroValueType(id: string) {
	appContext.commit('toggleMacroValueType', {
		macroId: id,
		groupId: props.node.id,
	});
}

function remove() {
	appContext.commit('removeNode', {
		nodeId: props.node.id,
	});
}

function collectAssets(): Asset[] {
	const assets = [] as Asset[];
	for (const node of props.node.nodes) {
		if (node.type === 'group') {
			// TODO
		} else if (node.fx === 'image') {
			const asset = appContext.state.assets.value.find(asset => asset.id === node.params.image.value);
			if (asset) {
				assets.push(asset);
			}
		}
	}
	return assets;
}

async function exportPreset() {
	await api.exportPresetFile({
		id: genId(),
		gsVersion: version,
		name: props.node.name ?? 'untitled',
		author: 'TODO',
		macros: props.node.macros,
		nodes: [props.node],
		assets: collectAssets().map(asset => ({
			id: asset.id,
			name: asset.name,
			width: asset.width,
			height: asset.height,
			fileDataType: asset.fileDataType,
			fileData: asset.fileData,
			hash: asset.hash,
		})),
	});
}

onMounted(() => {
	wireMap.out[props.node.id] = outPortEl.value;
	wireMap.allIn[props.node.id] = allInPortEl.value;
});
</script>

<style module lang="scss">
.root {
	position: relative;
	background: var(--THEME-nodeBg);
	border-radius: 4px;
	overflow: clip;
	contain: content;
}

.allInPort {
	position: absolute;
	top: 0;
	left: 0;
}

.header {
	padding: 0 88px 0 20px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	font-size: 14px;
	font-weight: bold;
	cursor: move;
	line-height: 32px;
}

.indicator {
	position: absolute;
	top: 9px;
	left: 8px;
	width: 4px;
	height: 12px;
	border-top: solid 1px transparent;
	border-bottom: solid 1px #383838;
	background: #111;
	box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.3) inset;
	border-radius: 2px;

	&.active {
		background: #ace620;
		background-clip: content-box;
	}

	&.processing {
		background: #e87900;
		background-clip: content-box;
	}
}

.buttons {
	position: absolute;
	top: 4px;
	right: 4px;
	text-align: right;
}

.headerButton {
	display: inline-block;
	width: 23px;
	height: 23px;
	font-size: 12px;
	padding-left: 0;
	padding-right: 0;

	&:not(:first-child) {
		margin-left: 6px;
	}
}

.settings {
	margin: 4px;
	padding: 4px;
}

.macroEditor {
	padding: 8px;
}

.params {
	background: rgba(0, 0, 0, 0.3);
	padding: 0 16px;
}

.param {
	display: flex;
	padding: 8px 0;

	&:not(:first-child) {
		border-top: solid 1px rgba(255, 255, 255, 0.05);
	}

	&:not(:last-child) {
		border-bottom: solid 1px rgba(0, 0, 0, 0.5);
	}
}

.paramLabel {
	width: 30%;
	box-sizing: border-box;
	padding-top: 4px;
	padding-right: 8px;
	flex-shrink: 0;
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
	font-size: 14px;
	color: rgba(255, 255, 255, 0.9);
	cursor: pointer;

	&.expression {
		color: var(--THEME-expression);
	}
}

.paramBody {
	width: 70%;
	flex-shrink: 1;
}

.nodes {
	background: var(--THEME-bg);
	border-radius: 6px;
	margin: 8px;
	padding: 8px;
}

.footer {
	display: flex;
	line-height: 24px;
	background-size: auto auto;
	background-color: #2d2d2d;
	background-image: repeating-linear-gradient(45deg, transparent, transparent 6px, #222222 6px, #222222 12px );
}

.port {
	width: 24px;
	text-align: center;
}

.nodeId {
	opacity: 0.5;
}
</style>
