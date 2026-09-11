<template>
<div :class="$style.root">
	<div :class="$style.header">{{ player.name }}</div>
	<div :class="$style.buttons">
		<GsButton :class="$style.button" :vTooltip="i18n.ts.ReplaceAsset" @click="replace()"><i class="ti ti-refresh"></i></GsButton>
		<GsButton :class="$style.button" :vTooltip="i18n.ts.RenameAsset" @click="rename()"><i class="ti ti-cursor-text"></i></GsButton>
		<GsButton :class="$style.button" :vTooltip="i18n.ts.RemoveAsset" @click="remove()"><i class="ti ti-trash"></i></GsButton>
	</div>
	<div :class="$style.body">
		<GsVideoControls v-if="videoEl != null" :video="videoEl" :class="$style.videoControl"/>
	</div>
</div>
</template>

<script lang="ts" setup>
import { shallowRef, onMounted, nextTick } from 'vue';
import GsButton from './common/GsButton.vue';
import GsVideoControls from './common/GsVideoControls.vue';
import type { Player } from '@glitch/shared/types.ts';
import { i18n } from '@/i18n.ts';
import * as api from '@/api.ts';
import { appContext, engine } from '@/app.ts';

const props = defineProps<{
	player: Player;
}>();

const videoEl = shallowRef<HTMLVideoElement | null>(null);

function remove() {
	//appContext.commit('removePlayer', {
	//	playerId: props.player.id,
	//});
}

async function rename() {
	//const { canceled, result } = await inputDialog({ default: props.asset.name });
	//if (canceled) return;
	//appContext.commit('renamePlayer', {
	//	playerId: props.player.id,
	//	name: result,
	//});
}

function replace() {
	// Implement the replace logic here
}

onMounted(() => {
	videoEl.value = engine.getVideoElement(props.player.id);
});

</script>

<style module lang="scss">
.root {
	position: relative;
	background: rgba(255, 255, 255, 0.1);
	border: solid 1px rgba(255, 255, 255, 0.1);
	border-radius: 4px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
	overflow: hidden;
}

.header {
	padding: 0 88px 0 8px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	font-weight: bold;
	background: linear-gradient(0deg, rgba(0, 0, 0, 0.2), rgba(255, 255, 255, 0.025));
	border-bottom: solid 1px rgba(0, 0, 0, 0.5);
	line-height: 32px;
	text-shadow: 0 -1px #000;

	&.disabled {
		pointer-events: none;
	}
}

.buttons {
	position: absolute;
	top: 4px;
	right: 4px;
	text-align: right;
	width: 85px;
}

.button {
	display: inline-block;
	width: 23px;
	height: 23px;
	font-size: 90%;
	padding-left: 0;
	padding-right: 0;
}

.body {
	height: 120px;
	padding: 8px;
}

.videoControl {
	width: 100%;
	height: 100%;
}
</style>
