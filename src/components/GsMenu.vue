<template>
<div role="menu">
	<div
		ref="itemsEl" v-hotkey="keymap"
		class="_popup _shadow"
		:class="[$style.root, { [$style.center]: align === 'center', [$style.asDrawer]: asDrawer }]"
		:style="{ width: (width && !asDrawer) ? width + 'px' : '', maxHeight: maxHeight ? maxHeight + 'px' : '' }"
		@contextmenu.self="e => e.preventDefault()"
	>
		<template v-for="(item, i) in items2">
			<div v-if="item === null" role="separator" :class="$style.divider"></div>
			<span v-else-if="item.type === 'label'" role="menuitem" :class="[$style.label, $style.item]">
				<span>{{ item.text }}</span>
			</span>
			<span v-else-if="item.type === 'pending'" role="menuitem" :tabindex="i" :class="[$style.pending, $style.item]">
				<span><MkEllipsis/></span>
			</span>
			<MkA v-else-if="item.type === 'link'" role="menuitem" :to="item.to" :tabindex="i" class="_button" :class="$style.item" @click.passive="close(true)" @mouseenter.passive="onItemMouseEnter(item)" @mouseleave.passive="onItemMouseLeave(item)">
				<i v-if="item.icon" class="ti-fw" :class="[$style.icon, item.icon]"></i>
				<MkAvatar v-if="item.avatar" :user="item.avatar" :class="$style.avatar"/>
				<span>{{ item.text }}</span>
				<span v-if="item.indicate" :class="$style.indicator"><i class="_indicatorCircle"></i></span>
			</MkA>
			<a v-else-if="item.type === 'a'" role="menuitem" :href="item.href" :target="item.target" :download="item.download" :tabindex="i" class="_button" :class="$style.item" @click="close(true)" @mouseenter.passive="onItemMouseEnter(item)" @mouseleave.passive="onItemMouseLeave(item)">
				<i v-if="item.icon" class="ti-fw" :class="[$style.icon, item.icon]"></i>
				<span>{{ item.text }}</span>
				<span v-if="item.indicate" :class="$style.indicator"><i class="_indicatorCircle"></i></span>
			</a>
			<button v-else-if="item.type === 'user'" role="menuitem" :tabindex="i" class="_button" :class="[$style.item, { [$style.active]: item.active }]" :disabled="item.active" @click="clicked(item.action, $event)" @mouseenter.passive="onItemMouseEnter(item)" @mouseleave.passive="onItemMouseLeave(item)">
				<MkAvatar :user="item.user" :class="$style.avatar"/><MkUserName :user="item.user"/>
				<span v-if="item.indicate" :class="$style.indicator"><i class="_indicatorCircle"></i></span>
			</button>
			<span v-else-if="item.type === 'switch'" role="menuitemcheckbox" :tabindex="i" :class="$style.item" @mouseenter.passive="onItemMouseEnter(item)" @mouseleave.passive="onItemMouseLeave(item)">
				<MkSwitch v-model="item.ref" :disabled="item.disabled" class="form-switch">{{ item.text }}</MkSwitch>
			</span>
			<button v-else-if="item.type === 'parent'" role="menuitem" :tabindex="i" class="_button" :class="[$style.item, $style.parent, { [$style.childShowing]: childShowingItem === item }]" @mouseenter="showChildren(item, $event)">
				<i v-if="item.icon" class="ti-fw" :class="[$style.icon, item.icon]"></i>
				<span>{{ item.text }}</span>
				<span :class="$style.caret"><i class="ti ti-chevron-right ti-fw"></i></span>
			</button>
			<button v-else :tabindex="i" class="_button" role="menuitem" :class="[$style.item, { [$style.danger]: item.danger, [$style.active]: item.active }]" :disabled="item.active" @click="clicked(item.action, $event)" @mouseenter.passive="onItemMouseEnter(item)" @mouseleave.passive="onItemMouseLeave(item)">
				<i v-if="item.icon" class="ti-fw" :class="[$style.icon, item.icon]"></i>
				<MkAvatar v-if="item.avatar" :user="item.avatar" :class="$style.avatar"/>
				<span>{{ item.text }}</span>
				<span v-if="item.indicate" :class="$style.indicator"><i class="_indicatorCircle"></i></span>
			</button>
		</template>
		<span v-if="items2.length === 0" :class="[$style.none, $style.item]">
			<span>{{ i18n.ts.none }}</span>
		</span>
	</div>
	<div v-if="childMenu">
		<XChild ref="child" :items="childMenu" :targetElement="childTarget" :rootElement="itemsEl" showing @actioned="childActioned"/>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { MenuItem, InnerMenuItem, MenuPending, MenuAction } from '@/app';

//const XChild = defineAsyncComponent(() => import('./MkMenu.child.vue'));

const props = defineProps<{
	items: MenuItem[];
	viaKeyboard?: boolean;
	asDrawer?: boolean;
	align?: 'center' | string;
	width?: number;
	maxHeight?: number;
}>();

const emit = defineEmits<{
	(ev: 'close', actioned?: boolean): void;
}>();

let itemsEl = shallowRef<HTMLDivElement>();

let items2: InnerMenuItem[] = ref([]);

let child = shallowRef<InstanceType<typeof XChild>>();

let keymap = computed(() => ({
	'esc': close,
}));

let childShowingItem = ref<MenuItem | null>();

watch(() => props.items, () => {
	const items: (MenuItem | MenuPending)[] = [...props.items].filter(item => item !== undefined);

	for (let i = 0; i < items.length; i++) {
		const item = items[i];

		if (item && 'then' in item) { // if item is Promise
			items[i] = { type: 'pending' };
			item.then(actualItem => {
				items2[i] = actualItem;
			});
		}
	}

	items2 = items as InnerMenuItem[];
}, {
	immediate: true,
});

let childMenu = ref<MenuItem[] | null>();
let childTarget = shallowRef<HTMLElement | null>();

function closeChild() {
	childMenu.value = null;
	childShowingItem.value = null;
}

function childActioned() {
	closeChild();
	close(true);
}

function onGlobalMousedown(event: MouseEvent) {
	if (childTarget.value && (event.target === childTarget.value || childTarget.value.contains(event.target))) return;
	if (child.value && child.value.checkHit(event)) return;
	closeChild();
}

let childCloseTimer: null | number = null;
function onItemMouseEnter(item) {
	childCloseTimer = window.setTimeout(() => {
		closeChild();
	}, 300);
}
function onItemMouseLeave(item) {
	if (childCloseTimer) window.clearTimeout(childCloseTimer);
}

let childrenCache = new WeakMap();
async function showChildren(item: MenuItem, ev: MouseEvent) {
	const children = ref([]);
	if (childrenCache.has(item)) {
		children.value = childrenCache.get(item);
	} else {
		if (typeof item.children === 'function') {
			children.value = [{
				type: 'pending',
			}];
			item.children().then(x => {
				children.value = x;
				childrenCache.set(item, x);
			});
		} else {
			children.value = item.children;
		}
	}

	childTarget.value = ev.currentTarget ?? ev.target;
	childMenu = children;
	childShowingItem.value = item;
}

function clicked(fn: MenuAction, ev: MouseEvent) {
	fn(ev);
	close(true);
}

function close(actioned = false) {
	emit('close', actioned);
}

onMounted(() => {
	// TODO: アクティブな要素までスクロール
	//itemsEl.scrollTo();

	document.addEventListener('mousedown', onGlobalMousedown, { passive: true });
});

onBeforeUnmount(() => {
	document.removeEventListener('mousedown', onGlobalMousedown);
});
</script>

<style lang="scss" module>
.root {
	padding: 8px 0;
	box-sizing: border-box;
	min-width: 200px;
	overflow: auto;
	overscroll-behavior: contain;

	&.center {
		> .item {
			text-align: center;
		}
	}
}

.item {
	display: block;
	position: relative;
	padding: 4px 16px;
	width: 100%;
	box-sizing: border-box;
	white-space: nowrap;
	font-size: 0.9em;
	line-height: 16px;
	text-align: left;
	overflow: hidden;
	text-overflow: ellipsis;

	&:before {
		content: "";
		display: block;
		position: absolute;
		z-index: -1;
		top: 0;
		left: 0;
		right: 0;
		margin: auto;
		width: 100%;
		height: 100%;
	}

	&:not(:disabled):hover {
		color: var(--accent);
		text-decoration: none;

		&:before {
			background: var(--accentedBg);
		}
	}

	&.danger {
		color: #ff2a2a;

		&:hover {
			color: #fff;

			&:before {
				background: #ff4242;
			}
		}

		&:active {
			color: #fff;

			&:before {
				background: #d42e2e !important;
			}
		}
	}

	&:active,
	&.active {
		color: var(--fgOnAccent) !important;
		opacity: 1;

		&:before {
			background: var(--accent) !important;
		}
	}

	&:not(:active):focus-visible {
		box-shadow: 0 0 0 2px var(--focus) inset;
	}

	&.label {
		pointer-events: none;
		font-size: 0.7em;
		padding-bottom: 4px;

		> span {
			opacity: 0.7;
		}
	}

	&.pending {
		pointer-events: none;
		opacity: 0.7;
	}

	&.none {
		pointer-events: none;
		opacity: 0.7;
	}

	&.parent {
		display: flex;
		align-items: center;
		cursor: default;

		&.childShowing {
			color: var(--accent);
			text-decoration: none;

			&:before {
				background: var(--accentedBg);
			}
		}
	}
}

.icon {
	margin-right: 8px;
}

.caret {
	margin-left: auto;
}

.avatar {
	margin-right: 5px;
	width: 20px;
	height: 20px;
}

.indicator {
	position: absolute;
	top: 5px;
	left: 13px;
	color: var(--indicator);
	font-size: 12px;
	animation: blink 1s infinite;
}

.divider {
	margin: 8px 0;
	border-top: solid 0.5px var(--divider);
}
</style>
