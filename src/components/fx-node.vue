<template>
<div class="node-component">
	<div ref="allInPortEl" class="allInPort">・</div>
	<header class="drag-handle" @dblclick="expanded = !expanded">{{ name }}</header>
	<div class="indicator" :class="{ active: node.isEnabled, processing: subStore.processingFxId === node.id }"></div>
	<div class="buttons">
		<GsIconButton class="expand" @click="expanded = !expanded"><Fa :icon="expanded ? faChevronUp : faChevronDown"/></GsIconButton>
		<GsIconButton class="active" :primary="node.isEnabled" @click="toggleEnable()" :title="node.isEnabled ? i18n.ts.ClickToDisable : i18n.ts.ClickToEnable"><Fa :icon="node.isEnabled ? faEye : faEyeSlash"/></GsIconButton>
		<GsIconButton class="remove" @click="remove()" :title="i18n.ts.RemoveEffect"><Fa :icon="faTimes"/></GsIconButton>
	</div>

	<div class="params" v-show="expanded">
		<div v-for="param in Object.keys(paramDefs).filter(k => subStore.showAllParams ? true : !k.startsWith('_'))" :key="param" v-show="paramDefs[param].visibility == null || paramDefs[param].visibility(node.params)">
			<label :class="{ expression: isExpression(param) }" @click="changeValueType(param, $event)">{{ paramDefs[param].label }}</label>
			<div v-if="isExpression(param)">
				<input type="text" class="expression" :value="getParam(param)" @change="updateParamAsExpression(param, $event.target.value)"/>
			</div>
			<div v-else-if="isAutomation(param)">
				<GsButton class="automation" @click="selectAutomation(param, $event)">{{ node.params[param].value ? store.automations.find(a => a.id === node.params[param].value).name : '(none)' }}</GsButton>
			</div>
			<XControl v-else :type="paramDefs[param].type" :group="group" :node="node" :name="param" :options="paramDefs[param]" :value="getParam(param)" @input="updateParamAsLiteral(param, $event)"/>
		</div>
	</div>

	<div class="footer">
		<div ref="outPortEl" class="port">・</div>
		<code>{{ node.id }}</code>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, computed, shallowRef, onMounted } from 'vue';
import { faTimes, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { faEye, faEyeSlash } from '@fortawesome/free-regular-svg-icons';
import XControl from './control.vue';
import { fxs } from '@/engine/fxs';
import { subStore } from '@/sub-store';
import { useStore } from '@/store';
import { i18n } from '@/i18n';
import { GsFxNode, GsGroupNode } from '@/engine/renderer';
import GsIconButton from './GsIconButton.vue';
import GsButton from './GsButton.vue';
import { popupMenu, wireMap } from '@/app';
import { GsAutomation } from '@/engine/types';

const store = useStore();

const props = defineProps<{
	node: GsFxNode,
	group: GsGroupNode,
}>();

const name = ref<string>(fxs[props.node.fx].displayName);
const paramDefs = ref<ParamDefs>(fxs[props.node.fx].paramDefs);
const expanded = ref(true);
const processing = computed(() => subStore.processingFxId === props.node.id);
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

function isExpression(param: string) {
	return props.node.params[param].type === 'expression';
}

function isAutomation(param: string) {
	return props.node.params[param].type === 'automation';
}

function getParam(param: string) {
	return props.node.params[param].value;
}

async function selectAutomation(param: string, ev: MouseEvent) {
	const a = await new Promise<GsAutomation | null>((res) => {
		popupMenu([{
			text: '(none)',
			action: () => {
				res(null);
			}
		}, ...(store.automations.map(a => ({
			text: a.name,
			action: () => {
				res(a);
			}
		})))], ev.currentTarget ?? ev.target);
	});

	store.updateParamAsAutomation({
		nodeId: props.node.id,
		param: param,
		value: a?.id ?? null,
	});
}

async function changeValueType(param: string, ev: MouseEvent) {
	const type = await new Promise((res) => {
		popupMenu([{
			text: 'Literal',
			action: () => {
				res('literal');
			}
		}, {
			text: 'Automation',
			action: () => {
				res('automation');
			}
		}, {
			text: 'Expression',
			action: () => {
				res('expression');
			}
		}], ev.currentTarget ?? ev.target);
	});

	store.changeParamValueType({
		nodeId: props.node.id,
		param: param,
		type: type,
	});
}

function updateParamAsLiteral(param: string, value: any) {
	store.updateParamAsLiteral({
		nodeId: props.node.id,
		param: param,
		value: value
	});
}

function updateParamAsExpression(param: string, value: string) {
	store.updateParamAsExpression({
		nodeId: props.node.id,
		param: param,
		value: value
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

onMounted(() => {
	wireMap.out[props.node.id] = outPortEl.value;
	wireMap.allIn[props.node.id] = allInPortEl.value;
});
</script>

<style scoped lang="scss">
.node-component {
	position: relative;
	background: rgba(255, 255, 255, 0.1);
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
