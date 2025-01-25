<template>
<div :class="$style.root" ref="rootEl">
	<svg v-for="wire in wires" version="1.1" :viewBox="`0 0 ${width} ${height}`" :class="$style.wire">
		<line :x1="wire.from[0]" :y1="wire.from[1]" :x2="wire.to[0]" :y2="wire.to[1]" style="stroke: currentColor; stroke-width: 3;" />
	</svg>
</div>
</template>

<script lang="ts" setup>
import { wireMap } from '@/app';
import { fxs } from '@/engine/fxs';
import { GsNode } from '@/engine/renderer';
import { useStore } from '@/store';
import { version } from '@/version';
import { onMounted, ref, shallowRef, watch } from 'vue';

const store = useStore();

const props = defineProps<{
}>();

const rootEl = shallowRef<HTMLElement>();
const width = ref(0);
const height = ref(0);

const ro = new ResizeObserver(() => {
	width.value = rootEl.value.clientWidth;
	height.value = rootEl.value.clientHeight;
});

onMounted(() => {
	ro.observe(rootEl.value);
});

const wires = ref<{
	from: [number, number];
	to: [number, number];
}[]>([]);

function getElementPosition(el: HTMLElement): [number, number] {
	const rootElRect = rootEl.value.getBoundingClientRect();
	const rect = el.getBoundingClientRect();
	return [
		rect.left - rootElRect.left + rect.width / 2,
		rect.top - rootElRect.top + rect.height / 2,
	];
}

function isHidden(el: HTMLElement) {
	return (el.offsetParent === null);
}

function draw() {
	try {
		wires.value = [];

		function scan(nodes: GsNode[]) {
			for (const node of nodes) {
				if (node.type === 'group') {
					scan(node.nodes);
				} else {
					const fx = fxs[node.fx];
					for (const [k, v] of Object.entries(fx.paramDefs)) {
						if (v.type === 'node' && node.params[k].value != null) {
							const to = isHidden(wireMap.in[node.id][k]) ? getElementPosition(wireMap.allIn[node.id]) : getElementPosition(wireMap.in[node.id][k]);
							wires.value.push({
								from: getElementPosition(wireMap.out[node.params[k].value]),
								to,
							});
						} else if (v.type === 'nodes') {
							for (let i = 0; i < node.params[k].value.length; i++) {
								const n = node.params[k].value[i];
								const to = isHidden(wireMap.in[node.id][k][i]) ? getElementPosition(wireMap.allIn[node.id]) : getElementPosition(wireMap.in[node.id][k][i]);
								wires.value.push({
									from: getElementPosition(wireMap.out[n]),
									to,
								});
							}
						}
					}
				}
			}
		}

		scan(store.nodes);
	} catch (e) {
		console.error(e);
	}
}

watch(wireMap, () => {
	draw();
}, { deep: true, immediate: true });

onMounted(() => {
	setInterval(() => {
		draw();
	}, 10);
});
</script>

<style module lang="scss">
.root {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
}

.wire {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	color: var(--accent);
	opacity: 0.3;
}
</style>
