<template>
<div class="assets-componet _gs-container">
	<header>
		<button @click="addAsset()">{{ i18n.ts.AddAsset }}...</button>
	</header>
	<div class="assets" v-if="store.assets.length === 0">
		<p class="_gs-no-contents">{{ i18n.ts.NoAssets }}</p>
	</div>
	<div class="assets" v-else>
		<XAsset v-for="asset in store.assets" :asset="asset" :key="asset.id"/>
	</div>
</div>
</template>

<script lang="ts" setup>
import {} from 'vue';
import XAsset from './asset.vue';
import { useStore } from '@/store.js';
import { i18n } from '@/i18n.js';
import { genId } from '@/utils.js';
import * as api from '@/api.js';

const store = useStore();

async function addAsset() {
	const result = await api.openImageFile({});
	store.addAsset({
		id: genId(),
		name: result.name,
		width: result.img.width,
		height: result.img.height,
		data: result.img.data,
		fileDataType: result.type,
		fileData: result.fileData,
		hash: result.hash, // TODO
	});
}
</script>

<style scoped lang="scss">
.assets-componet {
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	height: 100%;
	padding: 8px;

	> header {
		padding-bottom: 8px;
	}

	> .assets {
		flex: 1;
		overflow: auto;
		border: solid 1px rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.3);
		box-shadow: 0 2px 2px rgba(0, 0, 0, 0.7) inset;
		border-radius: 6px;

		> *:not(p) {
			margin: 8px;
		}
	}
}
</style>
