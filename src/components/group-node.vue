<template>
<div class="group-node-component">
	<div ref="allInPortEl" class="allInPort">・</div>
	<header class="drag-handle" @dblclick="expanded = !expanded">Group: {{ node.name }}</header>
	<div class="indicator" :class="{ active: node.isEnabled, processing: subStore.processingFxId === node.id }"></div>
	<div class="buttons">
		<GsIconButton class="expand" @click="expanded = !expanded"><Fa :icon="expanded ? faChevronUp : faChevronDown"/></GsIconButton>
		<GsIconButton class="showSettings" @click="showSettings = !showSettings"><Fa :icon="faCog"/></GsIconButton>
		<GsIconButton class="remove" @click="remove()" :title="i18n.ts.RemoveEffect"><Fa :icon="faTimes"/></GsIconButton>
	</div>

	<div v-if="showSettings" v-show="expanded" style="margin: 4px; padding: 4px;" class="_gaps_s">
		<button @click="exportPreset">Export as preset</button>
		<input type="text" :value="node.name" @change="changeName($event.target.value)"/>
		<button @click="addMacro">Add macro</button>
		<XMacroEditor class="_gs-container" style="padding: 8px;" v-for="macro in node.macros" :macro="macro" :group="node" :key="macro.id"/>
	</div>

	<div class="params" v-show="expanded">
		<div v-for="macro in Object.values(node.macros)" :key="macro.id">
			<label :class="{ expression: isExpression(macro) }" @dblclick="toggleMacroValueType(macro.id)">{{ macro.label }}</label>
			<div v-if="isExpression(macro)">
				<input type="text" class="expression" :value="macro.value.value" @change="updateMacroAsExpression(macro.id, $event.target.value)"/>
			</div>
			<XControl v-else :type="macro.type" :node="node" :group="group" :options="macro.typeOptions" :value="macro.value.value" @input="updateMacroAsLiteral(macro.id, $event)"/>
		</div>
	</div>

	<div v-show="expanded" class="nodes">
		<GsNodes :group="node"/>
	</div>

	<div class="footer">
		<div ref="outPortEl" class="port">・</div>
		<code>{{ node.id }}</code>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, shallowRef } from 'vue';
import { faTimes, faChevronDown, faEllipsis, faCog, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { faEye, faEyeSlash } from '@fortawesome/free-regular-svg-icons';
import GsNodes from './GsNodes.vue';
import { fxs } from '@/engine/fxs';
import { subStore } from '@/sub-store';
import { useStore } from '@/store';
import { i18n } from '@/i18n';
import { GsGroupNode } from '@/engine/renderer';
import XControl from './control.vue';
import { Asset, Macro } from '@/types';
import XMacroEditor from './macro-editor.vue';
import { genId } from '@/utils';
import * as msgpack from '@msgpack/msgpack';
import { version } from '@/version';
import GsIconButton from './GsIconButton.vue';
import { wireMap } from '@/app';
import * as api from '@/api.js';

const store = useStore();

const props = defineProps<{
	node: GsGroupNode,
	group: GsGroupNode,
}>();

const expanded = ref(true);
const showSettings = ref(false);
const outPortEl = shallowRef<HTMLElement>();
const allInPortEl = shallowRef<HTMLElement>();

/*
this.$root.$on('expandAllFx', () => {
			this.expanded = true;
		});

		this.$root.$on('collapseAllFx', () => {
			this.expanded = false;
		});
*/

function addMacro() {
	store.addMacro({
		id: genId(),
		group: props.node,
	});
}

function isExpression(macro: Macro) {
	return macro.value.type === 'expression';
}

function changeName(name: string) {
	store.updateGroupName({
		nodeId: props.node.id,
		name,
	});
}

function updateMacroAsLiteral(id: string, value: any) {
	store.updateMacroAsLiteral({
		macroId: id,
		value: value,
		group: props.node,
	});
}

function updateMacroAsExpression(id: string, value: string) {
	store.updateMacroAsExpression({
		macroId: id,
		value: value,
		group: props.node,
	});
}

function toggleMacroValueType(id: string) {
	store.toggleMacroValueType({
		macroId: id,
		group: props.node,
	});
}

function remove() {
	store.removeNode({
		nodeId: props.node.id,
	});
}

function toggleEnable() {
	store.toggleEnable({
		nodeId: props.node.id,
	});
}

function collectAssets(): Asset[] {
	const assets = [] as Asset[];
	for (const node of props.node.nodes) {
		if (node.type === 'group') {
			// TODO
		} else if (node.fx === 'image') {
			const asset = store.assets.find(asset => asset.id === node.params.image.value);
			if (asset) {
				assets.push(asset);
			}
		}
	}
	return assets;
}

async function exportPreset() {
	await api.exportPreset({
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

<style scoped lang="scss">
.group-node-component {
	position: relative;
	background: #222;
	border: solid 1px rgba(255, 255, 255, 0.1);
	border-radius: 4px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
	overflow: clip;
	contain: content;

	> .allInPort {
		position: absolute;
		top: 0;
		left: 0;
	}

	> header {
		padding: 0 88px 0 20px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 14px;
		font-weight: bold;
		background: linear-gradient(0deg, rgba(0, 0, 0, 0.2), rgba(255, 255, 255, 0.025));
		border-bottom: solid 1px rgba(0, 0, 0, 0.5);
		cursor: move;
		line-height: 32px;
		text-shadow: 0 -1px #000;

		&.disabled {
			pointer-events: none;
		}
	}

	> .indicator {
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

	> .buttons {
		position: absolute;
		top: 4px;
		right: 4px;
		text-align: right;

		&.disabled {
			opacity: 0.7;
			pointer-events: none;
		}

		> button {
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
	}

	> .params {
		background: rgba(0, 0, 0, 0.3);
		padding: 0 16px;

		&.disabled {
			opacity: 0.7;
			pointer-events: none;
		}

		> div {
			display: flex;
			padding: 8px 0;

			&:not(:first-child) {
				border-top: solid 1px rgba(255, 255, 255, 0.05);
			}

			&:not(:last-child) {
				border-bottom: solid 1px rgba(0, 0, 0, 0.5);
			}

			> label {
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
					color: #9edc29;
				}
			}

			> div {
				width: 70%;
				flex-shrink: 1;
			}
		}
	}

	> .nodes {
		border: solid 1px rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.3);
		box-shadow: 0 2px 2px rgba(0, 0, 0, 0.7) inset;
		border-radius: 6px;
		margin: 8px;
		padding: 8px;
	}

	> .footer {
		display: flex;
		line-height: 24px;
		background-size: auto auto;
		background-color: #2d2d2d;
		background-image: repeating-linear-gradient(45deg, transparent, transparent 6px, #222222 6px, #222222 12px );

		> .port {
			width: 24px;
			text-align: center;
		}

		> code {
			opacity: 0.5;
		}
	}
}
</style>
