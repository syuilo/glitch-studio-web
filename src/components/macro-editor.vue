<template>
<div class="macro-editor-componet" :class="macro.type">
	<div>
		<input type="text" :value="macro.label" @change="updateMacroLabel(macro, $event.target.value)"/>
		<input type="text" :value="macro.name" @change="updateMacroName(macro, $event.target.value)"/>
		<GsSelect :modelValue="macro.type" @update:modelValue="v => updateMacroType(macro, v)">
			<option value="number">{{ i18n.ts._Macro._Types.Number }}</option>
			<option value="range">{{ i18n.ts._Macro._Types.Range }}</option>
			<option value="bool">{{ i18n.ts._Macro._Types.Flag }}</option>
			<option value="color">{{ i18n.ts._Macro._Types.Color }}</option>
			<option value="image">{{ i18n.ts._Macro._Types.Image }}</option>
		</GsSelect>
		<button class="remove" title="Remove macro" @click="remove(macro.id)"><Fa :icon="faTimes"/></button>
	</div>
	<div class="minmax" v-if="['number', 'range'].includes(macro.type)">
		<label>Min/Max</label>
		<div>
			<input type="number" :value="macro.typeOptions.min" @change="updateMacroTypeOption(macro, 'min', parseFloat($event.target.value, 10))"/>
			<input type="number" :value="macro.typeOptions.max" @change="updateMacroTypeOption(macro, 'max', parseFloat($event.target.value, 10))"/>
		</div>
	</div>
	<div class="step" v-if="['number', 'range'].includes(macro.type)">
		<label>Step</label>
		<div>
			<input type="number" :value="macro.typeOptions.step" @change="updateMacroTypeOption(macro, 'step', parseFloat($event.target.value, 10))"/>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import {} from 'vue';
import XControl from './control.vue';
import { useStore } from '@/store';
import { i18n } from '@/i18n';
import { Macro } from '@/types';
import { genId } from '@/utils';
import { GsGroupNode } from '@/engine/renderer';
import GsSelect from './GsSelect.vue';

const store = useStore();

const props = defineProps<{
	macro: Macro;
	group?: GsGroupNode;
}>();

function toggleMacroValueType(macro: Macro) {
	store.toggleMacroValueType({
		macroId: macro.id,
		group: props.group,
	});
}

function updateMacroLabel(macro: Macro, value: string) {
	store.updateMacroLabel({
		macroId: macro.id,
		value: value,
		group: props.group,
	});
}

function updateMacroName(macro: Macro, value: string) {
	store.updateMacroName({
		macroId: macro.id,
		value: value,
		group: props.group,
	});
}

function updateMacroType(macro: Macro, value: string) {
	store.updateMacroType({
		macroId: macro.id,
		value: value,
		group: props.group,
	});
}

function updateMacroTypeOption(macro: Macro, key: string, value: any) {
	store.updateMacroTypeOption({
		macroId: macro.id,
		key: key,
		value: value,
		group: props.group,
	});
}

function remove(macroId: string) {
	store.removeMacro({
		macroId: macroId,
		group: props.group,
	});
}
</script>

<style scoped lang="scss">
.macro-editor-componet {
	padding: 8px 0;

	&:not(:first-child) {
		border-top: solid 1px rgba(255, 255, 255, 0.05);
	}

	&:not(:last-child) {
		border-bottom: solid 1px rgba(0, 0, 0, 0.5);
	}

	> div:first-child {
		display: flex;

		> * {
			margin: 0 2px;

			&:first-child {
				margin-left: 0;
			}

			&:last-child {
				margin-right: 0;
			}

			&.remove {
				width: 64px;
			}
		}
	}

	> div:not(:first-child) {
		display: flex;
		padding: 8px 0;

		> label {
			width: 30%;
			box-sizing: border-box;
			padding-left: 8px;
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

	&.range {
		> .minmax > div {
			display: flex;

			> *:first-child {
				margin-right: 4px;
			}
		}
	}
}
</style>
