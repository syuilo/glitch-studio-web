import { reactive } from 'vue';
import { settingsStore } from './settings';

export const subStore = reactive({
	showAllParams: false, // TODO: true
	rendering: false,
	processingFxId: null,
	settingsStore: settingsStore,
});
