import { Ref, ref, markRaw, Component, reactive, watch } from 'vue';
import GsPopupMenu from '@/components/GsPopupMenu.vue';
import { useStore } from './store';
import { genId } from './utils';
import { fxs } from './engine/fxs';
import { GlitchRenderer, GsGroupNode } from './engine/renderer';
import { GsAutomation } from './engine/types';
import { subStore } from './sub-store';
//import GsContextMenu from '@/components/GsContextMenu.vue';

export type MenuAction = (ev: MouseEvent) => void;

export type MenuDivider = null;
export type MenuNull = undefined;
export type MenuLabel = { type: 'label', text: string };
export type MenuA = { type: 'a', href: string, target?: string, download?: string, text: string, icon?: string, indicate?: boolean };
export type MenuSwitch = { type: 'switch', ref: Ref<boolean>, text: string, disabled?: boolean };
export type MenuButton = { type?: 'button', text: string, icon?: string, indicate?: boolean, danger?: boolean, active?: boolean, action: MenuAction };
export type MenuParent = { type: 'parent', text: string, icon?: string, children: OuterMenuItem[] };

export type MenuPending = { type: 'pending' };

type OuterMenuItem = MenuDivider | MenuNull | MenuLabel | MenuA | MenuSwitch | MenuButton | MenuParent;
type OuterPromiseMenuItem = Promise<MenuLabel | MenuA | MenuSwitch | MenuButton | MenuParent>;
export type MenuItem = OuterMenuItem | OuterPromiseMenuItem;
export type InnerMenuItem = MenuDivider | MenuPending | MenuLabel | MenuA | MenuSwitch | MenuButton | MenuParent;

let popupIdCount = 0;
export const popups = ref([]) as Ref<{
	id: any;
	component: any;
	props: Record<string, any>;
}[]>;

const zIndexes = {
	veryLow: 500000,
	low: 1000000,
	middle: 2000000,
	high: 3000000,
};
export function claimZIndex(priority: keyof typeof zIndexes = 'low'): number {
	zIndexes[priority] += 100;
	return zIndexes[priority];
}

export async function popup(component: Component, props: Record<string, any>, events = {}, disposeEvent?: string) {
	markRaw(component);

	const id = ++popupIdCount;
	const dispose = () => {
		// このsetTimeoutが無いと挙動がおかしくなる(autocompleteが閉じなくなる)。Vueのバグ？
		window.setTimeout(() => {
			popups.value = popups.value.filter(popup => popup.id !== id);
		}, 0);
	};
	const state = {
		component,
		props,
		events: disposeEvent ? {
			...events,
			[disposeEvent]: dispose,
		} : events,
		id,
	};

	popups.value.push(state);

	return {
		dispose,
	};
}

export function popupMenu(items: MenuItem[] | Ref<MenuItem[]>, src?: HTMLElement, options?: {
	align?: string;
	width?: number;
	viaKeyboard?: boolean;
	onClosing?: () => void;
}): Promise<void> {
	return new Promise((resolve, reject) => {
		let dispose;
		popup(GsPopupMenu, {
			items,
			src,
			width: options?.width,
			align: options?.align,
			viaKeyboard: options?.viaKeyboard,
		}, {
			closed: () => {
				resolve();
				dispose();
			},
			closing: () => {
				if (options?.onClosing) options.onClosing();
			},
		}).then(res => {
			dispose = res.dispose;
		});
	});
}

export function contextMenu(items: MenuItem[] | Ref<MenuItem[]>, ev: MouseEvent): Promise<void> {
	ev.preventDefault();
	return new Promise((resolve, reject) => {
		let dispose;
		popup(GsContextMenu, {
			items,
			ev,
		}, {
			closed: () => {
				resolve();
				dispose();
			},
		}).then(res => {
			dispose = res.dispose;
		});
	});
}

export const wireMap = reactive<{
	in: Record<string, any>;
	out: Record<string, HTMLElement>;
	allIn: Record<string, HTMLElement>;
}>({
	in: {},
	out: {},
	allIn: {},
});

export function showAddNodeMenu(ev: MouseEvent, group?: GsGroupNode) {
	const store = useStore();

	popupMenu([{
		text: 'Group',
		action: () => {
			store.addGroupNode({
				id: genId()
			}, group);
		}
	}, ...Object.entries(fxs).filter(([_, v]) => v.category === '').map(x => ({
		text: x[1].displayName,
		action: () => {
			store.addFxNode({
				fx: x[1].name,
				id: genId()
			}, group);
		}
	})), {
		type: 'label',
		text: 'Glitch',
	}, ...Object.entries(fxs).filter(([_, v]) => v.category === 'glitch').map(x => ({
		text: x[1].displayName,
		action: () => {
			store.addFxNode({
				fx: x[1].name,
				id: genId()
			}, group);
		}
	})), {
		type: 'label',
		text: 'Effect',
	}, ...Object.entries(fxs).filter(([_, v]) => v.category === 'effect').map(x => ({
		text: x[1].displayName,
		action: () => {
			store.addFxNode({
				fx: x[1].name,
				id: genId()
			}, group);
		}
	})), {
		type: 'label',
		text: 'Draw',
	}, ...Object.entries(fxs).filter(([_, v]) => v.category === 'draw').map(x => ({
		text: x[1].displayName,
		action: () => {
			store.addFxNode({
				fx: x[1].name,
				id: genId()
			}, group);
		}
	})), {
		type: 'label',
		text: 'Color',
	}, ...Object.entries(fxs).filter(([_, v]) => v.category === 'color').map(x => ({
		text: x[1].displayName,
		action: () => {
			store.addFxNode({
				fx: x[1].name,
				id: genId()
			}, group);
		}
	})), {
		type: 'label',
		text: 'Utility',
	}, ...Object.entries(fxs).filter(([_, v]) => v.category === 'utility').map(x => ({
		text: x[1].displayName,
		action: () => {
			store.addFxNode({
				fx: x[1].name,
				id: genId()
			}, group);
		}
	}))], ev.currentTarget ?? ev.target);
}

function addFx(fx: string) {
	const store = useStore();
	if (fx == '') return;
	if (fx == '_group') {
		store.addGroupNode({
			id: genId()
		}, props.group);
	} else {
		store.addFxNode({
			fx: fx,
			id: genId()
		}, props.group);
	}
}

export const frameMax = ref(59);
export const frame = ref(0);
export const fps = ref(60);
export const playing = ref(false);

export const rendererEnv = {
	mouseX: 0,
	mouseY: 0,
};
export const glitchRenderer = new GlitchRenderer();

let store: ReturnType<typeof useStore>;

export async function render() {
	if (subStore.rendering) {
		return;
	}

	subStore.rendering = true;

	//console.time('render');
	try {
		if (store.nodes.length > 0) {
			await glitchRenderer.render(store.renderNodeId ?? store.nodes.at(-1).id, {
				mouseX: rendererEnv.mouseX,
				mouseY: rendererEnv.mouseY,
				frame: frame.value,
			});
		}
	} catch (e) {
		console.error(e);
		//window.alert(e);
		playing.value = false;
	}
	//console.timeEnd('render');

	subStore.rendering = false;

	window.requestAnimationFrame(render);
}

export function appReady() {
	store = useStore();

	watch(() => store.nodes, () => {
		glitchRenderer.nodes = store.nodes;
	
		// TODO: グループ考慮
		if (store.nodes.some(n => n.type === 'fx' && n.fx === 'webcamera')) {
			glitchRenderer.setupWebcam();
		}
	}, { deep: true });
	
	watch(() => store.macros, () => {
		glitchRenderer.macros = store.macros;
	}, { deep: true });
	
	watch(() => store.automations, () => {
		glitchRenderer.automations = store.automations;
	}, { deep: true });
	
	watch(() => store.assets, () => {
		glitchRenderer.assets = store.assets;
		glitchRenderer.bakeAssets();
	}, { deep: true });

	window.requestAnimationFrame(render);

	let lastTickTime = 0;
	let frameRequest: number;

	function tick(now: number) {
		const delta = now - lastTickTime;

		if (playing.value && delta > 1000 / fps.value) {
			if (frame.value + 1 > frameMax.value) {
				frame.value = 0;
			} else {
				frame.value++;
			}
			lastTickTime = now;
		}

		frameRequest = window.requestAnimationFrame(tick);
	}

	watch(playing, () => {
		if (playing.value) {
			frameRequest = window.requestAnimationFrame(tick);
		} else {
			window.cancelAnimationFrame(frameRequest);
		}
	}, { immediate: true });
}
