<template>
<div class="control-component">
	<div v-if="type === 'range'">
		<XSlider :modelValue="value" :step="options.step ?? 1" :min="options.min" :max="options.max" :title="`${options.min} ~ ${options.max}`" @update:modelValue="v => changeValue(parseFloat(v, 10))"/>
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
		<GsSelect :modelValue="value" @update:modelValue="v => changeValue(v)">
			<option v-for="o in options.options" :value="o.value" :key="o.value">{{ o.label }}</option>
		</GsSelect>
	</div>
	<div v-else-if="type === 'blendMode'">
		<GsSelect :modelValue="value" @update:modelValue="v => changeValue(v)">
			<option value="none">{{ i18n.ts._BlendModes.None }}</option>
			<optgroup :label="i18n.ts._BlendModes._Categories.Basic">
				<option value="normal">{{ i18n.ts._BlendModes.Normal }}</option>
			</optgroup>
			<optgroup :label="i18n.ts._BlendModes._Categories.Darken">
				<option value="darken">{{ i18n.ts._BlendModes.Darken }}</option>
				<option value="multiply">{{ i18n.ts._BlendModes.Multiply }}</option>
				<option value="colorBurn">{{ i18n.ts._BlendModes.ColorBurn }}</option>
			</optgroup>
			<optgroup :label="i18n.ts._BlendModes._Categories.Lighten">
				<option value="lighten">{{ i18n.ts._BlendModes.Lighten }}</option>
				<option value="screen">{{ i18n.ts._BlendModes.Screen }}</option>
				<option value="colorDodge">{{ i18n.ts._BlendModes.ColorDodge }}</option>
				<option value="add">{{ i18n.ts._BlendModes.Add }}</option>
			</optgroup>
			<optgroup :label="i18n.ts._BlendModes._Categories.Contrast">
				<option value="overlay">{{ i18n.ts._BlendModes.Overlay }}</option>
				<option value="softLight">{{ i18n.ts._BlendModes.SoftLight }}</option>
				<option value="hardLight">{{ i18n.ts._BlendModes.HardLight }}</option>
			</optgroup>
			<optgroup :label="i18n.ts._BlendModes._Categories.Comparative">
				<option value="difference">{{ i18n.ts._BlendModes.Difference }}</option>
				<option value="exclusion">{{ i18n.ts._BlendModes.Exclusion }}</option>
				<option value="subtract">{{ i18n.ts._BlendModes.Subtract }}</option>
			</optgroup>
			<optgroup :label="i18n.ts._BlendModes._Categories.Hsl">
				<option value="hue">{{ i18n.ts._BlendModes.Hue }}</option>
				<option value="saturation">{{ i18n.ts._BlendModes.Saturation }}</option>
				<option value="color">{{ i18n.ts._BlendModes.Color }}</option>
				<option value="luminosity">{{ i18n.ts._BlendModes.Luminosity }}</option>
			</optgroup>
		</GsSelect>
	</div>
	<div v-else-if="type === 'signal'">
		<XSignal :signal="value" @input="changeValue($event)"/>
	</div>
	<div v-else-if="type === 'xy'">
		<XXy :xy="value" @input="changeValue($event)"/>
	</div>
	<div v-else-if="type === 'wh'">
		<XXySlider :modelValue="value" @update:modelValue="v => changeValue(v)" :step="options.step ?? 1" :min="options.min" :max="options.max"/>
	</div>
	<div v-else-if="type === 'color'">
		<XColor :color="value" @input="changeValue($event)"/>
	</div>
	<div v-else-if="type === 'seed'" class="seed">
		<input type="number" :value="value" @change="changeValue(parseInt($event.target.value, 10))"/><button :title="i18n.ts.Random" @click="() => changeValue(Math.floor(Math.random() * 16384))"><Fa :icon="faRandom"/></button>
	</div>
	<div v-else-if="type === 'time'" class="time">
		<input type="number" :value="value" @change="changeValue(parseInt($event.target.value, 10))"/><button :title="i18n.ts.Random" @click="() => changeValue(Math.floor(Math.random() * 16384))"><Fa :icon="faRandom"/></button>
	</div>
	<div v-else-if="type === 'node'" style="display: flex;">
		<div ref="portEl">・</div>
		<GsSelect :modelValue="value" @update:modelValue="v => changeValue(v)">
			<option :value="null">{{ i18n.ts.None }}</option>
			<optgroup label="In group" v-if="group && group.nodes.length > 0">
				<option v-for="node in group.nodes.filter(x => x.id !== props.node.id)" :value="node.id" :key="node.id">{{ node.type === 'fx' ? fxs[node.fx].displayName : node.name }} [{{ node.id }}]</option>
			</optgroup>
			<optgroup label="Nodes" v-if="store.nodes.length > 0">
				<option v-for="node in store.nodes.filter(x => x.id !== props.node.id)" :value="node.id" :key="node.id">{{ node.type === 'fx' ? fxs[node.fx].displayName : node.name }} [{{ node.id }}]</option>
			</optgroup>
		</GsSelect>
	</div>
	<div v-else-if="type === 'nodes'">
		<XNodesInput :modelValue="value" @update:modelValue="v => changeValue(v)" :node="node" :group="group" :name="name"/>
	</div>
	<div v-else-if="type === 'image'">
		<GsSelect :modelValue="value" @update:modelValue="v => changeValue(v)">
			<option :value="null">{{ i18n.ts.None }}</option>
			<optgroup label="Assets" v-if="store.assets.length > 0">
				<option v-for="asset in store.assets" :value="asset.id" :key="asset.id">{{ asset.name }}</option>
			</optgroup>
		</GsSelect>
	</div>
</div>
</template>

<script lang="ts" setup>
import { onMounted, shallowRef } from 'vue';
import XSignal from './signal.vue';
import XXy from './xy.vue';
import XXySlider from './xy-slider.vue';
import XColor from './color.vue';
import XSlider from './slider.vue';
import XSlider2 from './slider2.vue';
import XNodesInput from './nodes-input.vue';
import { fxs } from '@/engine/fxs';
import { useStore } from '@/store';
import { i18n } from '@/i18n';
import { GsGroupNode, GsNode } from '@/engine/renderer';
import GsButton from './GsButton.vue';
import GsSelect from './GsSelect.vue';
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

<style scoped lang="scss">
.control-component {
	> .seed {
		display: flex;

		> button {
			width: 38px;
			height: 25px;
			margin-left: 6px;
		}
	}
}
</style>
