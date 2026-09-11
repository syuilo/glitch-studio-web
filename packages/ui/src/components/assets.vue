<template>
<div class="_gs-container _gaps" :class="$style.root">
	<div>
		<GsButton @click="addAsset()">{{ i18n.ts.AddAsset }}...</GsButton>
	</div>

	<div v-if="appContext.state.assets.value.length === 0" :class="$style.assets">
		<p class="_gs-no-contents">{{ i18n.ts.NoAssets }}</p>
	</div>
	<div v-else :class="$style.assets">
		<XAsset v-for="asset in appContext.state.assets.value" :key="asset.id" :asset="asset"/>
	</div>
</div>
</template>

<script lang="ts" setup>
import {} from 'vue';
import { genId } from '@glitch/shared/utility/id.ts';
import XAsset from './asset.vue';
import GsButton from './common/GsButton.vue';
import { i18n } from '@/i18n.ts';
import * as api from '@/api.ts';
import { appContext } from '@/app.ts';

async function addAsset() {
	const result = await api.openMediaFile({});
	if (!result) return;
	const assetId = genId();
	appContext.commit('addAsset', {
		id: assetId,
		name: result.name,
		width: result.width,
		height: result.height,
		data: result.data,
		fileDataType: result.type,
		fileData: result.fileData,
		hash: result.hash, // TODO
	});
	if (result.type.startsWith('audio/') || result.type.startsWith('video/')) {
		appContext.commit('addPlayer', { id: genId(), name: result.name, type: 'asset', assetId });
	}
}
</script>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	height: 100%;
	padding: 8px;
}

.assets {
	flex: 1;
	overflow: auto;
	border: solid 1px rgba(255, 255, 255, 0.1);
	background: rgba(0, 0, 0, 0.3);
	box-shadow: 0 2px 2px rgba(0, 0, 0, 0.7) inset;
	border-radius: 6px;
}
</style>
