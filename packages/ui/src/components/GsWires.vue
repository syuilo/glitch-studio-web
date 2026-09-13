<template>
<div ref="rootEl" :class="$style.root">
	<svg v-for="(wire, index) in wires" :key="wire.key" version="1.1" :viewBox="`0 0 ${width} ${height}`" :class="$style.wire">
		<defs>
			<linearGradient :id="`${gradientId}-${index}`" gradientUnits="userSpaceOnUse" :gradientTransform="getGradientTransform(wire)" x1="0" y1="0" x2="1" y2="0" spreadMethod="repeat">
				<stop offset="0" stop-color="currentColor" stop-opacity="0"/>
				<stop offset="0.25" stop-color="currentColor" stop-opacity="0"/>
				<stop offset="0.5" stop-color="currentColor" stop-opacity="0.9"/>
				<stop offset="0.75" stop-color="currentColor" stop-opacity="0"/>
				<stop offset="1" stop-color="currentColor" stop-opacity="0"/>
				<animate attributeName="x1" from="0" to="1" dur="1.6s" repeatCount="indefinite"/>
				<animate attributeName="x2" from="1" to="2" dur="1.6s" repeatCount="indefinite"/>
			</linearGradient>
		</defs>
		<line :x1="wire.from[0]" :y1="wire.from[1]" :x2="wire.to[0]" :y2="wire.to[1]" stroke="currentColor" stroke-width="3" opacity="0.3"/>
		<line :x1="wire.from[0]" :y1="wire.from[1]" :x2="wire.to[0]" :y2="wire.to[1]" :stroke="`url(#${gradientId}-${index})`" stroke-width="3"/>
	</svg>
</div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref, useId, useTemplateRef, watch } from 'vue';
import { fxDefinitions } from '@glitch/shared/fx-definitions.ts';
import type { GsNode } from '@glitch/shared/types.ts';
import { appContext, wireMap } from '@/app.ts';

const rootEl = useTemplateRef('rootEl');
const gradientId = useId();
const width = ref(0);
const height = ref(0);

const ro = new ResizeObserver(() => {
	if (rootEl.value == null) return;
	width.value = rootEl.value.clientWidth;
	height.value = rootEl.value.clientHeight;
});

onMounted(() => {
	if (rootEl.value) ro.observe(rootEl.value);
});

const wires = ref<{
	key: string;
	from: [number, number];
	to: [number, number];
}[]>([]);

function getGradientTransform(wire: typeof wires.value[number]): string {
	const dx = wire.to[0] - wire.from[0];
	const dy = wire.to[1] - wire.from[1];
	// グラデーションの1周期を配線全長に合わせ、光の幅と速度を長さに比例させる。
	// 両端が重なる場合も変換行列が特異にならないようにする。
	const x = dx === 0 && dy === 0 ? 1 : dx;
	return `matrix(${x} ${dy} ${-dy} ${x} ${wire.from[0]} ${wire.from[1]})`;
}

function getElementPosition(el: HTMLElement): [number, number] {
	const rootElRect = rootEl.value!.getBoundingClientRect();
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
					const fx = fxDefinitions[node.fx];
					for (const [k, v] of Object.entries(fx.paramDefs)) {
						const param = node.params[k];
						const connections = param.type === 'node'
							? [param.nodeId == null ? null : param]
							: param.type === 'literal' && v.type === 'node' ? [param.value]
								: param.type === 'literal' && v.type === 'nodes' ? param.value : [];
						for (const [index, connection] of connections.entries()) {
							if (connection == null) continue;
							const from = wireMap.out[connection.nodeId]?.[connection.outputPort];
							const input = v.type === 'nodes' ? wireMap.in[node.id]?.[k]?.[index] : wireMap.in[node.id]?.[k];
							const to = input && !isHidden(input) ? input : wireMap.allIn[node.id];
							if (!from || !to || isHidden(from) || isHidden(to)) continue;
							wires.value.push({
								key: JSON.stringify([node.id, k, index, connection.nodeId, connection.outputPort]),
								from: getElementPosition(from),
								to: getElementPosition(to),
							});
						}
					}
				}
			}
		}

		scan(appContext.state.nodes.value);
	} catch (e) {
		console.error(e);
	}
}

watch(wireMap, () => {
	draw();
}, { deep: true, immediate: true });

let drawInterval: ReturnType<typeof window.setInterval>;
onMounted(() => {
	drawInterval = window.setInterval(() => {
		draw();
	}, 10);
});
onUnmounted(() => {
	window.clearInterval(drawInterval);
	ro.disconnect();
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
	color: var(--THEME-accent);
}
</style>
