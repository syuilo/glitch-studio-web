<template>
<div class="settings-componet _gs-container">
	
</div>
</template>

<script lang="ts" setup>
import {} from 'vue';
import { useStore } from '@/store.js';
import { i18n } from '@/i18n.js';
import { genId } from '@/utils.js';
import * as api from '@/api.js';

const store = useStore();


</script>

<style scoped lang="scss">
.settings-componet {
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	height: 100%;
	padding: 8px;
}
</style>
