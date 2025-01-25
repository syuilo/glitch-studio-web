import { reactive } from 'vue';
import { settingsStore, SettingsStore } from './settings';

export type State = {
	showAllParams: boolean;
	rendering: boolean;
	processingFxId: string | null;
	settingsStore: SettingsStore;
}

export const subStore = reactive({
	showAllParams: false, // TODO: true
	rendering: false,
	processingFxId: null,
	settingsStore: settingsStore,
});
