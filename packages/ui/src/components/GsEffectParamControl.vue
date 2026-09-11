<template>
<div :class="$style.root">
	<div v-if="type === 'range'">
		<GsRange
			:modelValue="value"
			:step="options.step ?? 1"
			:min="options.min"
			:max="options.max"
			:title="`${options.min} ~ ${options.max}`"
			:continuousUpdate="true"
			@beginChanging="onBeginChanging"
			@update:modelValue="changeContinuous"
			@changeFinished="onFinishChanging"
		/>
	</div>
	<div v-if="type === 'range2'">
		<!--<XSlider2 :modelValue="value" :step="options.step ?? 1" :min="options.min" :max="options.max" :title="`${options.min} ~ ${options.max}`" @beginChanging="onBeginChanging" @update:modelValue="changeContinuous" @changeFinished="onFinishChanging"/>-->
	</div>
	<div v-else-if="type === 'number'">
		<GsInput small type="number" :modelValue="value" :min="options.min" :max="options.max" @update:modelValue="changeValue(parseFloat($event, 10))"/>
	</div>
	<div v-else-if="type === 'bool'">
		<GsButton small :primary="value" @click="changeValue(!value)">{{ value ? 'On' : 'Off' }}</GsButton>
	</div>
	<div v-else-if="type === 'enum'">
		<GsSelect small :modelValue="value" :items="options.options" @update:modelValue="v => changeValue(v)"/>
	</div>
	<div v-else-if="type === 'blendMode'">
		<GsSelect
			small
			:modelValue="value"
			:items="[
				{ label: i18n.ts._BlendModes.None, value: 'none' },
				{
					type: 'group',
					label: i18n.ts._BlendModes._Categories.Basic,
					items: [
						{ label: i18n.ts._BlendModes.Normal, value: 'normal' },
					],
				},
				{
					type: 'group',
					label: i18n.ts._BlendModes._Categories.Darken,
					items: [
						{ label: i18n.ts._BlendModes.Darken, value: 'darken' },
						{ label: i18n.ts._BlendModes.Multiply, value: 'multiply' },
						{ label: i18n.ts._BlendModes.ColorBurn, value: 'colorBurn' },
					],
				},
				{
					type: 'group',
					label: i18n.ts._BlendModes._Categories.Lighten,
					items: [
						{ label: i18n.ts._BlendModes.Lighten, value: 'lighten' },
						{ label: i18n.ts._BlendModes.Screen, value: 'screen' },
						{ label: i18n.ts._BlendModes.ColorDodge, value: 'colorDodge' },
						{ label: i18n.ts._BlendModes.Add, value: 'add' },
					],
				},
				{
					type: 'group',
					label: i18n.ts._BlendModes._Categories.Contrast,
					items: [
						{ label: i18n.ts._BlendModes.Overlay, value: 'overlay' },
						{ label: i18n.ts._BlendModes.SoftLight, value: 'softLight' },
						{ label: i18n.ts._BlendModes.HardLight, value: 'hardLight' },
					],
				},
				{
					type: 'group',
					label: i18n.ts._BlendModes._Categories.Comparative,
					items: [
						{ label: i18n.ts._BlendModes.Difference, value: 'difference' },
						{ label: i18n.ts._BlendModes.Exclusion, value: 'exclusion' },
						{ label: i18n.ts._BlendModes.Subtract, value: 'subtract' },
					],
				},
				{
					type: 'group',
					label: i18n.ts._BlendModes._Categories.Hsl,
					items: [
						{ label: i18n.ts._BlendModes.Hue, value: 'hue' },
						{ label: i18n.ts._BlendModes.Saturation, value: 'saturation' },
						{ label: i18n.ts._BlendModes.Color, value: 'color' },
						{ label: i18n.ts._BlendModes.Luminosity, value: 'luminosity' },
					],
				},
			]"
			@update:modelValue="v => changeValue(v)"
		/>
	</div>
	<div v-else-if="type === 'signal'">
		<GsSignal :signal="value" @input="changeValue($event)"/>
	</div>
	<div v-else-if="type === 'xy'">
		<GsXy :modelValue="value" :step="options.step ?? 0.1" :min="options.min" :max="options.max" @beginChanging="onBeginChanging" @update:modelValue="v => changeContinuous(v)" @changeFinished="onFinishChanging"/>
	</div>
	<div v-else-if="type === 'wh'">
		<XXySlider :modelValue="value" :step="options.step ?? 0.1" :min="options.min" :max="options.max" @update:modelValue="v => changeValue(v)"/>
	</div>
	<div v-else-if="type === 'vector'" style="max-width: 150px;">
		<GsXy :modelValue="value" :step="options.step ?? 0.1" :min="options.min" :max="options.max" @beginChanging="onBeginChanging" @update:modelValue="v => changeContinuous(v)" @changeFinished="onFinishChanging"/>
	</div>
	<div v-else-if="type === 'color'">
		<XColor :color="value" @input="changeValue($event)"/>
	</div>
	<div v-else-if="type === 'seed'" class="seed">
		<input type="number" :value="value" @change="changeValue(parseInt($event.target.value, 10))"/><button :title="i18n.ts.Random" @click="() => changeValue(Math.floor(Math.random() * 16384))"><i class="ti ti-dice-5"></i></button>
	</div>
	<div v-else-if="type === 'time'" class="time">
		<input type="number" :value="value" @change="changeValue(parseInt($event.target.value, 10))"/><button :title="i18n.ts.Random" @click="() => changeValue(Math.floor(Math.random() * 16384))"><i class="ti ti-dice-5"></i></button>
	</div>
	<div v-else-if="type === 'node'" style="display: flex;">
		<div ref="portEl">・</div>
		<GsSelect
			small
			:modelValue="value"
			:items="[
				{ label: i18n.ts.None, value: null },
				...(group && group.nodes.length > 0 ? [{
					type: 'group' as const,
					label: 'In group',
					items: group.nodes.filter(x => x.id !== props.node.id).map(node => ({
						label: `${node.type === 'fx' ? fxDefinitions[node.fx].displayName : node.name} [${node.id}]`,
						value: node.id,
					})),
				}] : []),
				...(appContext.state.nodes.value.length > 0 ? [{
					type: 'group' as const,
					label: 'Nodes',
					items: appContext.state.nodes.value.filter(x => x.id !== props.node.id).map(node => ({
						label: `${node.type === 'fx' ? fxDefinitions[node.fx].displayName : node.name} [${node.id}]`,
						value: node.id,
					})),
				}] : []),
			]"
			@update:modelValue="v => changeValue(v)"
		/>
	</div>
	<div v-else-if="type === 'nodes'">
		<XNodesInput :modelValue="value" :node="node" :group="group" :name="name" @update:modelValue="v => changeValue(v)"/>
	</div>
	<div v-else-if="type === 'image'">
		<GsSelect
			small
			:modelValue="value"
			:items="[
				{ label: i18n.ts.None, value: null },
				...(appContext.state.assets.value.length > 0 ? [{
					type: 'group' as const,
					label: 'Assets',
					items: appContext.state.assets.value.filter(asset => asset.fileDataType.startsWith('image/')).map(asset => ({ label: asset.name, value: asset.id })),
				}] : []),
			]"
			@update:modelValue="v => changeValue(v)"
		/>
	</div>
	<div v-else-if="type === 'player'">
		<GsSelect
			small
			:modelValue="value"
			:items="[
				{ label: i18n.ts.None, value: null },
				...(appContext.state.players.value.length > 0 ? [{
					type: 'group' as const,
					label: 'Players',
					items: appContext.state.players.value.map(player => ({ label: player.name, value: player.id })),
				}] : []),
			]"
			@update:modelValue="v => changeValue(v)"
		/>
	</div>
</div>
</template>

<script lang="ts" setup>
import { onMounted, shallowRef } from 'vue';
import { fxDefinitions } from '@glitch/shared/fx-definitions.ts';
import GsSignal from './common/GsSignal.vue';
import GsXy from './common/GsXy.vue';
import XXySlider from './common/xy-slider.vue';
import XColor from './common/GsColor.vue';
import GsInput from './common/GsInput.vue';
import GsRange from './common/GsRange.vue';
import XNodesInput from './nodes-input.vue';
import GsButton from './common/GsButton.vue';
import GsSelect from './common/GsSelect.vue';
import GsVideoControls from './common/GsVideoControls.vue';
import type { GsGroupNode, GsNode } from '@glitch/shared/types.ts';
import { i18n } from '@/i18n.ts';
import { appContext, engine, wireMap } from '@/app.ts';

const props = defineProps<{
	type: string;
	value: any;
	options?: any;
	node?: GsNode;
	group?: GsGroupNode | null;
	name?: string;
}>();

const emit = defineEmits<{
	(ev: 'input', value: any): void;
	(ev: 'beginChanging'): void;
	(ev: 'changeFinished'): void;
	(ev: 'changeContinuous', value: any): void;
}>();

const portEl = shallowRef<HTMLElement>();

function changeValue(value: any) {
	emit('input', value);
}

function onBeginChanging() {
	emit('beginChanging');
}

function changeContinuous(value: any) {
	emit('changeContinuous', value);
}

function onFinishChanging() {
	emit('changeFinished');
}

onMounted(() => {
	if (portEl.value) {
		if (wireMap.in[props.node.id] == null) wireMap.in[props.node.id] = {};
		wireMap.in[props.node.id][props.name] = portEl.value;
	}
});
</script>

<style module lang="scss">
.root {
}

.seed {
	display: flex;
}

.seedButton {
	width: 38px;
	height: 25px;
	margin-left: 6px;
}

.player {
	margin-top: 8px;
}
</style>
