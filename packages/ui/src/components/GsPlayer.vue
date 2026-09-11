<template>
<div :class="$style.root">
	<div :class="$style.header">{{ player.name }}</div>
	<div :class="$style.buttons">
		<GsButton :class="$style.button" :vTooltip="i18n.ts.ReplaceAsset" @click="replace()"><i class="ti ti-refresh"></i></GsButton>
		<GsButton :class="$style.button" :vTooltip="i18n.ts.RenameAsset" @click="rename()"><i class="ti ti-cursor-text"></i></GsButton>
		<GsButton :class="$style.button" :vTooltip="i18n.ts.RemoveAsset" @click="remove()"><i class="ti ti-trash"></i></GsButton>
	</div>
	<div :class="$style.body">
		<GsVideoControls
			v-if="videoEl != null" :video="videoEl" :class="$style.videoControl"
			:play="() => engine.playPlayer(player.id)"
			:getVolume="player.type === 'asset' ? () => engine.getPlayerVolume(player.id) : undefined"
			:setVolume="player.type === 'asset' ? volume => engine.setPlayerVolume(player.id, volume) : undefined"
		/>
		<div :class="$style.levelMeter"><GsAudioLevelMeter :levels="engine.getPlayerLevels(player.id)"/></div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import GsButton from './common/GsButton.vue';
import GsVideoControls from './common/GsVideoControls.vue';
import GsAudioLevelMeter from './common/GsAudioLevelMeter.vue';
import type { Player } from '@glitch/shared/types.ts';
import { i18n } from '@/i18n.ts';
import * as api from '@/api.ts';
import { appContext, engine } from '@/app.ts';

const props = defineProps<{
	player: Player;
}>();

const videoEl = computed(() => engine.getMediaElement(props.player.id));

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

</script>

<style module lang="scss">
.root {
	position: relative;
	border-radius: 4px;
	overflow: clip;
	background: var(--THEME-panel);
}

.header {
	padding: 0 88px 0 8px;
	white-space: nowrap;
	overflow: clip;
	text-overflow: ellipsis;
	font-weight: bold;
	line-height: 32px;
	font-size: 95%;
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
	display: flex;
	flex-direction: column;
	gap: 8px;
	height: 120px;
	padding: 8px;
}

.videoControl {
	flex: 1;
	min-height: 0;
	width: 100%;
}

.levelMeter {
	flex: 0 0 12px;
	width: 100%;
}
</style>
