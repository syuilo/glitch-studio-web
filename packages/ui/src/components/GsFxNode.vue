<template>
<div :class="$style.root">
	<div ref="allInPortEl" :class="$style.allInPort">・</div>
	<div :class="$style.header" class="drag-handle" @dblclick="expanded = !expanded">{{ name }}</div>
	<div :class="[$style.indicator, { active: node.isEnabled }]"></div>
	<div :class="$style.headerButtons">
		<GsButton :class="[$style.headerButton]" inline small iconOnly @click="expanded = !expanded"><i class="ti" :class="expanded ? 'ti-chevron-up' : 'ti-chevron-down'"></i></GsButton>
		<GsButton :class="[$style.headerButton]" inline small iconOnly :primary="node.isEnabled" :title="node.isEnabled ? i18n.ts.ClickToDisable : i18n.ts.ClickToEnable" @click="toggleEnable()"><i class="ti" :class="node.isEnabled ? 'ti-eye' : 'ti-eye-off'"></i></GsButton>
		<GsButton :class="[$style.headerButton]" inline small iconOnly :title="i18n.ts.RemoveEffect" @click="remove()"><i class="ti ti-x"></i></GsButton>
	</div>

	<div v-show="expanded" :class="$style.params">
		<div v-for="param in Object.keys(paramDefs)" v-show="paramDefs[param].visibility == null || paramDefs[param].visibility(node.params)" :key="param" :class="$style.param">
			<div :class="[$style.paramLabel, { [$style.expression]: isExpression(param) }]" @click="changeValueType(param, $event)">
				<GsCondensedLine>{{ paramDefs[param].label }}</GsCondensedLine>
			</div>
			<div :class="$style.paramBody">
				<GsInput v-if="isExpression(param)" type="text" :modelValue="getParam(param)" @update:modelValue="updateParamAsExpression(param, $event)"/>
				<GsButton v-else-if="isAutomation(param)" @click="selectAutomation(param, $event)">{{ node.params[param].automationId ? appContext.state.automations.value.find(a => a.id === node.params[param].automationId).name : '(none)' }}</GsButton>
				<GsButton v-else-if="isNode(param)" @click="selectNode(param, $event)">{{ node.params[param].nodeId ? appContext.state.nodes.value.find(n => n.id === node.params[param].nodeId).id : '(none)' }}</GsButton>
				<GsEffectParamControl
					v-else
					:type="paramDefs[param].type"
					:group="group"
					:node="node"
					:name="param"
					:title="paramDefs[param].label"
					:options="paramDefs[param]"
					:value="getParam(param)"
					@input="updateParamAsLiteral(param, $event)"
					@beginChanging="onBeginChanging(param)"
					@changeContinuous="changeContinuous(param, $event)"
					@changeFinished="onFinishChanging(param)"
				/>
			</div>
		</div>
	</div>

	<div :class="$style.footer">
		<div ref="outPortEl" style="width: 24px; text-align: center;">・</div>
		<code style="opacity: 0.5;">{{ node.id }}</code>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, computed, shallowRef, onMounted } from 'vue';
import { fxDefinitions } from '@glitch/shared/fx-definitions.ts';
import { genId } from '@glitch/shared/utility/id.ts';
import GsEffectParamControl from './GsEffectParamControl.vue';
import GsButton from './common/GsButton.vue';
import GsInput from './common/GsInput.vue';
import GsCondensedLine from './common/GsCondensedLine.vue';
import type { GsAutomation, GsFxNode, GsGroupNode, GsNode } from '@glitch/shared/types.ts';
import { i18n } from '@/i18n.ts';
import { appContext, wireMap } from '@/app.ts';
import * as ui from '@/ui.ts';

const props = defineProps<{
	node: GsFxNode,
	group: GsGroupNode | null,
}>();

const name = ref<string>(fxDefinitions[props.node.fx].displayName);
const paramDefs = ref<ParamDefs>(fxDefinitions[props.node.fx].paramDefs);
const expanded = ref(true);
const outPortEl = shallowRef<HTMLElement>();
const allInPortEl = shallowRef<HTMLElement>();

function isExpression(param: string) {
	return props.node.params[param].type === 'expression';
}

function isAutomation(param: string) {
	return props.node.params[param].type === 'automation';
}

function isNode(param: string) {
	return props.node.params[param].type === 'node';
}

function getParam(param: string) {
	if (isExpression(param)) {
		return props.node.params[param].expression;
	} else if (isAutomation(param)) {
		return props.node.params[param].automationId;
	} else if (isNode(param)) {
		return props.node.params[param].nodeId;
	} else {
		return props.node.params[param].value;
	}
}

async function selectAutomation(param: string, ev: MouseEvent) {
	const a = await new Promise<GsAutomation | null>((res) => {
		ui.popupMenu([{
			text: '(none)',
			action: () => {
				res(null);
			},
		}, ...(appContext.state.automations.value.map(a => ({
			text: a.name,
			action: () => {
				res(a);
			},
		})))], ev.currentTarget ?? ev.target);
	});

	appContext.commit('updateParamAsAutomation', {
		nodeId: props.node.id,
		param: param,
		value: a?.id ?? null,
	});
}

async function selectNode(param: string, ev: MouseEvent) {
	const n = await new Promise<GsNode | null>((res) => {
		ui.popupMenu([{
			text: '(none)',
			action: () => {
				res(null);
			},
		}, ...(appContext.state.nodes.value.map(n => ({
			text: n.id,
			action: () => {
				res(n);
			},
		})))], ev.currentTarget ?? ev.target);
	});

	appContext.commit('updateParamAsNode', {
		nodeId: props.node.id,
		param: param,
		value: n?.id ?? null,
	});
}

async function changeValueType(param: string, ev: MouseEvent) {
	const type = await new Promise((res) => {
		ui.popupMenu([{
			text: 'Literal',
			action: () => {
				res('literal');
			},
		}, {
			text: 'Automation',
			action: () => {
				res('automation');
			},
		}, {
			text: 'Expression',
			action: () => {
				res('expression');
			},
		}, { // TODO: 対応している場合のみ
			text: 'Node',
			action: () => {
				res('node');
			},
		}], ev.currentTarget ?? ev.target);
	});

	appContext.commit('changeParamValueType', {
		nodeId: props.node.id,
		param: param,
		type: type,
	});
}

let commandMergeKey: string | null = null;

function onBeginChanging(param: string) {
	commandMergeKey = genId();
}

function changeContinuous(param: string, value: any) {
	appContext.commit('updateParamAsLiteral', {
		nodeId: props.node.id,
		param: param,
		value: value,
	}, commandMergeKey);
}

function onFinishChanging(param: string) {
	commandMergeKey = null;
}

function updateParamAsLiteral(param: string, value: any) {
	appContext.commit('updateParamAsLiteral', {
		nodeId: props.node.id,
		param: param,
		value: value,
	});
}

function updateParamAsExpression(param: string, value: string) {
	appContext.commit('updateParamAsExpression', {
		nodeId: props.node.id,
		param: param,
		value: value,
	});
}

function remove() {
	appContext.commit('removeNode', {
		nodeId: props.node.id,
	});
}

function toggleEnable() {
	appContext.commit('changeNodeEnableState', {
		nodeId: props.node.id,
		enabled: !props.node.isEnabled,
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
	font-size: 95%;
	font-weight: bold;
	cursor: move;
	line-height: 32px;
	background: linear-gradient(0deg, var(--THEME-nodeBg), hsl(from var(--THEME-nodeBg) h s calc(l + 5)));

	&.disabled {
		pointer-events: none;
	}
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
}

.headerButtons {
	position: absolute;
	top: 4px;
	right: 4px;
	text-align: right;

	&.disabled {
		opacity: 0.7;
		pointer-events: none;
	}
}

.headerButton {
	display: inline-block;
	width: 23px;
	height: 23px;
	font-size: 90%;
	padding-left: 0;
	padding-right: 0;

	&:not(:first-child) {
		margin-left: 6px;
	}
}

.params {
	&.disabled {
		opacity: 0.7;
		pointer-events: none;
	}
}

.param {
	display: flex;
	padding: 4px 16px;
	box-sizing: border-box;
	min-height: 32px;

	&:hover {
		background: #ffffff08;
	}
}

.paramLabel {
	place-content: center left;
	width: 30%;
	box-sizing: border-box;
	padding-right: 8px;
	flex-shrink: 0;
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: clip;
	font-size: 95%;
	cursor: pointer;

	&.expression {
		color: var(--THEME-expression);
	}
}

.paramBody {
	width: 70%;
	flex-shrink: 1;
}

.footer {
	display: flex;
	margin-top: 4px;
	line-height: 24px;
	background-size: auto auto;
	background-color: #2d2d2d;
	background-image: repeating-linear-gradient(45deg, transparent, transparent 6px, #222222 6px, #222222 12px );
}
</style>
