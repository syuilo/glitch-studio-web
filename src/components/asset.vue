<template>
<div class="asset-component">
	<header>{{ asset.name }}</header>
	<div class="buttons">
		<button class="replace" @click="replace()" :title="i18n.ts.ReplaceAsset"><Fa :icon="faSyncAlt"/></button>
		<button class="rename" @click="rename()" :title="i18n.ts.RenameAsset"><Fa :icon="faICursor"/></button>
		<button class="remove" @click="remove()" :title="i18n.ts.RemoveAsset"><Fa :icon="faTrashAlt"/></button>
	</div>
	<div class="body">
		<canvas :width="asset.width" :height="asset.height" ref="canvas"/>
	</div>
</div>
</template>

<script lang="ts" setup>
import { shallowRef, onMounted, nextTick } from 'vue';
import { useStore } from '@/store';
import { i18n } from '@/i18n';
import { Asset } from '@/types';
import * as api from '@/api.js';

const store = useStore();

const props = defineProps<{
	asset: Asset;
}>();

const canvas = shallowRef<HTMLCanvasElement>();

function remove() {
	store.removeAsset({
		assetId: props.asset.id,
	});
}

async function rename() {
	const { canceled, result } = await inputDialog({ default: props.asset.name });
	if (canceled) return;
	store.renameAsset({
		assetId: props.asset.id,
		name: result
	});
}

async function replace() {
	const result = await api.openImageFile({});
	store.replaceAsset({
		assetId: props.asset.id,
		width: result.img.width,
		height: result.img.height,
		data: result.img.data,
		fileDataType: result.type,
		fileData: result.fileData,
		hash: result.hash, // TODO
	});
	nextTick(() => {
		const ctx = canvas.value.getContext('2d')!;
		if (props.asset.data) {
			ctx.putImageData(new ImageData(new Uint8ClampedArray(props.asset.data), props.asset.width, props.asset.height), 0, 0);
		}
	});
}

onMounted(() => {
	const ctx = canvas.value.getContext('2d')!;
	if (props.asset.data) {
		ctx.putImageData(new ImageData(new Uint8ClampedArray(props.asset.data), props.asset.width, props.asset.height), 0, 0);
	}
});

</script>

<style scoped lang="scss">
.asset-component {
	position: relative;
	background: rgba(255, 255, 255, 0.1);
	border: solid 1px rgba(255, 255, 255, 0.1);
	border-radius: 4px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
	overflow: hidden;

	> header {
		padding: 0 88px 0 8px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 14px;
		font-weight: bold;
		background: linear-gradient(0deg, rgba(0, 0, 0, 0.2), rgba(255, 255, 255, 0.025));
		border-bottom: solid 1px rgba(0, 0, 0, 0.5);
		line-height: 32px;
		text-shadow: 0 -1px #000;

		&.disabled {
			pointer-events: none;
		}
	}

	> .buttons {
		position: absolute;
		top: 4px;
		right: 4px;
		text-align: right;
		width: 85px;

		> button {
			display: inline-block;
			width: 23px;
			height: 23px;
			font-size: 12px;
			padding-left: 0;
			padding-right: 0;

			&:not(:first-child) {
				margin-left: 6px;
			}

			> * {
				height: 100%;
			}
		}
	}

	> .body {
		height: 120px;
		padding: 8px;

		> canvas {
			display: block;
			width: 100%;
			height: 100%;
			object-fit: contain;
		}
	}
}
</style>
