<template>
<div class="macros-componet _gs-container">
	<div class="macros _gs-container">
		<div v-for="macro in store.macros" :key="macro.id">
			<label :class="{ expression: macro.value.type === 'expression' }" @dblclick="toggleMacroValueType(macro)">{{ macro.label }}</label>
			<div v-if="macro.value.type === 'expression'">
				<input type="text" class="expression" :value="macro.value.value" @change="updateMacroAsExpression(macro, $event.target.value)"/>
			</div>
			<XControl v-else :type="macro.type" :value="macro.value.value" :options="macro.typeOptions" @input="updateMacroAsLiteral(macro, $event)"/>
		</div>
		<p v-if="store.macros.length === 0" class="_gs-no-contents">{{ i18n.ts.NoMacros }}</p>
	</div>
	<div class="macros-editor _gs-container">
		<button @click="addMacro()">{{ i18n.ts.AddMacro }}</button>
		<header>
			<div>{{ i18n.ts._Macro.Label }}</div>
			<div>{{ i18n.ts._Macro.Name }}</div>
			<div>{{ i18n.ts._Macro.Type }}</div>
			<div class="padding"></div>
		</header>
		<div class="list">
			<XMacroEditor v-for="macro in store.macros" :macro="macro" :key="macro.id"/>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import {} from 'vue';
import XControl from './control.vue';
import XMacroEditor from './macro-editor.vue';
import { useStore } from '@/store';
import { i18n } from '@/i18n';
import { Macro } from '@/types';
import { genId } from '@/utils';

const store = useStore();

function addMacro() {
	store.addMacro({
		id: genId()
	});
}

function updateMacroAsLiteral(macro: Macro, value: any) {
	store.updateMacroAsLiteral({
		macroId: macro.id,
		value: value
	});
}

function updateMacroAsExpression(macro: Macro, value: string) {
	store.updateMacroAsExpression({
		macroId: macro.id,
		value: value
	});
}

function toggleMacroValueType(macro: Macro) {
	store.toggleMacroValueType({
		macroId: macro.id,
	});
}

function updateMacroLabel(macro: Macro, value: string) {
	store.updateMacroLabel({
		macroId: macro.id,
		value: value
	});
}

function updateMacroName(macro: Macro, value: string) {
	store.updateMacroName({
		macroId: macro.id,
		value: value
	});
}

function updateMacroType(macro: Macro, value: string) {
	store.updateMacroType({
		macroId: macro.id,
		value: value
	});
}

function updateMacroTypeOption(macro: Macro, key: string, value: any) {
	store.updateMacroTypeOption({
		macroId: macro.id,
		key: key,
		value: value
	});
}

function remove(macroId: string) {
	store.removeMacro(macroId);
}
</script>

<style scoped lang="scss">
.macros-componet {
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	height: 100%;
	padding: 8px;

	> .macros {
		flex: 1;
		padding: 0 16px;
		margin-bottom: 8px;
		overflow: auto;

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
				padding-right: 4px;
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

	> .macros-editor {
		flex: 1;
		padding: 8px;
		overflow: auto;

		> header {
			display: flex;
			font-size: 12px;
			margin: 12px 0 0 0;
			opacity: 0.8;

			> * {
				width: 100%;
				margin: 0 2px;
				padding: 0 2px;

				&:first-child {
					margin-left: 0;
				}

				&:last-child {
					margin-right: 0;
				}
			}

			> .padding {
				width: 64px;
			}
		}
	}
}
</style>
