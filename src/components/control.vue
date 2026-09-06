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
			@update:modelValue="v => changeValue(parseFloat(v, 10))"
		/>
	</div>
	<div v-if="type === 'range2'">
		<XSlider2 :modelValue="value" :step="options.step ?? 1" :min="options.min" :max="options.max" :title="`${options.min} ~ ${options.max}`" @update:modelValue="v => changeValue(v)"/>
	</div>
	<div v-else-if="type === 'number'">
		<input type="number" :value="value" :min="options.min" :max="options.max" @change="changeValue(parseFloat($event.target.value, 10))"/>
	</div>
	<div v-else-if="type === 'bool'">
		<GsButton @click="changeValue(!value)" :primary="value">{{ value ? 'On' : 'Off' }}</GsButton>
	</div>
	<div v-else-if="type === 'enum'">
		<GsSelect :modelValue="value" :items="options.options" @update:modelValue="v => changeValue(v)"/>
	</div>
	<div v-else-if="type === 'blendMode'">
		<GsSelect
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
		<XSignal :signal="value" @input="changeValue($event)"/>
	</div>
	<div v-else-if="type === 'xy'">
		<XXy :modelValue="value" @update:modelValue="v => changeValue(v)" :step="options.step ?? 0.1" :min="options.min" :max="options.max"/>
	</div>
	<div v-else-if="type === 'wh'">
		<XXySlider :modelValue="value" @update:modelValue="v => changeValue(v)" :step="options.step ?? 0.1" :min="options.min" :max="options.max"/>
	</div>
	<div v-else-if="type === 'vector'">
		<XXy :modelValue="value" @update:modelValue="v => changeValue(v)" :step="options.step ?? 0.1" :min="options.min" :max="options.max"/>
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
			:modelValue="value"
			:items="[
				{ label: i18n.ts.None, value: null },
				...(group && group.nodes.length > 0 ? [{
					type: 'group' as const,
					label: 'In group',
					items: group.nodes.filter(x => x.id !== props.node.id).map(node => ({
						label: `${node.type === 'fx' ? fxs[node.fx].displayName : node.name} [${node.id}]`,
						value: node.id,
					})),
				}] : []),
				...(store.nodes.length > 0 ? [{
					type: 'group' as const,
					label: 'Nodes',
					items: store.nodes.filter(x => x.id !== props.node.id).map(node => ({
						label: `${node.type === 'fx' ? fxs[node.fx].displayName : node.name} [${node.id}]`,
						value: node.id,
					})),
				}] : []),
			]"
			@update:modelValue="v => changeValue(v)"
		/>
	</div>
	<div v-else-if="type === 'nodes'">
		<XNodesInput :modelValue="value" @update:modelValue="v => changeValue(v)" :node="node" :group="group" :name="name"/>
	</div>
	<div v-else-if="type === 'image'">
		<GsSelect
			:modelValue="value"
			:items="[
				{ label: i18n.ts.None, value: null },
				...(store.assets.length > 0 ? [{
					type: 'group' as const,
					label: 'Assets',
					items: store.assets.map(asset => ({ label: asset.name, value: asset.id })),
				}] : []),
			]"
			@update:modelValue="v => changeValue(v)"
		/>
		<div :class="$style.player" v-if="store.assets.find(asset => asset.id === value)?.fileDataType.startsWith('video/')">
			TODO
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { onMounted, shallowRef } from 'vue';
import XSignal from './signal.vue';
import XXy from './xy.vue';
import XXySlider from './xy-slider.vue';
import XColor from './color.vue';
import GsRange from './common/GsRange.vue';
import XSlider2 from './slider2.vue';
import XNodesInput from './nodes-input.vue';
import { fxs } from '@/engine/fxs';
import { useStore } from '@/store';
import { i18n } from '@/i18n';
import { GsGroupNode, GsNode } from '@/engine/renderer-legacy.ts';
import GsButton from './common/GsButton.vue';
import GsSelect from './common/GsSelect.vue';
import { wireMap } from '@/app';

const store = useStore();

const props = defineProps<{
	type: string;
	value: any;
	options?: any;
	node?: GsNode;
	group?: GsGroupNode;
	name?: string;
}>();

const emit = defineEmits<{
	(ev: 'input', value: any): void;
}>();

const portEl = shallowRef<HTMLElement>();

function changeValue(value: any) {
	emit('input', value);
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
}
</style>
