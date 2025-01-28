<template>
<XDialog>
	<div class="about-componet">
		<div class="section">
			<img src="/gs.svg" style="display: block; margin: 0 auto 8px auto; width: 64px; height: 64px;">
			<div><b>Glitch Studio for Web</b></div>
			<div>{{ version }}</div>
		</div>
		<div class="section">
			<small style="display: block;">
				<div>Copyright (c) 2024-2025 syuilo</div>
				<a class="_gs-link" href="https://github.com/syuilo/glitch-studio-web" target="_blank">https://github.com/syuilo/glitch-studio-web</a>
			</small>
		</div>
		<GsButton inline @click="emit('ok')">OK</GsButton>
	</div>
</XDialog>
</template>

<script lang="ts" setup>
import { version } from '@/version';
import XDialog from './dialog.vue';
import GsButton from './GsButton.vue';

const emit = defineEmits<{
	(ev: 'ok'): void;
}>();

function open(url: string) {
	//shell.openExternal(url);
}
</script>

<style scoped lang="scss">
.about-componet {
	> .section {
		margin: 0 0 16px 0;
	}
}
</style>
