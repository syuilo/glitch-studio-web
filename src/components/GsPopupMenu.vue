<template>
<MkModal ref="modal" v-slot="{ maxHeight }" :zPriority="'high'" :src="src" :transparentBg="true" @click="modal.close()" @close="emit('closing')" @closed="emit('closed')">
	<MkMenu :items="items" :align="align" :width="width" :max-height="maxHeight" @close="modal.close()"/>
</MkModal>
</template>

<script lang="ts" setup>
import { shallowRef } from 'vue';
import MkModal from './GsModal.vue';
import MkMenu from './GsMenu.vue';
import { MenuItem } from '@/app';

defineProps<{
	items: MenuItem[];
	align?: 'center' | string;
	width?: number;
	viaKeyboard?: boolean;
	src?: any;
}>();

const emit = defineEmits<{
	(ev: 'closed'): void;
	(ev: 'closing'): void;
}>();

let modal = shallowRef<InstanceType<typeof MkModal>>();
</script>

<style lang="scss" module>
</style>
