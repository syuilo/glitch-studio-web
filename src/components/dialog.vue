<template>
<div class="dialog-componet">
	<div class="_gs-container">
		<slot></slot>
	</div>
</div>
</template>

<script lang="ts" setup>
</script>

<style scoped lang="scss">
.dialog-componet {
	position: fixed;
	z-index: 1000;
	top: 0;
	left: 8;
	width: 100%;
	height: 100%;
	background: rgba(0, 0, 0, 0.1);
	backdrop-filter: blur(4px);

	> div {
		position: absolute;
		top: 50%;
		right: 0;
		left: 0;
		width: 300px;
		margin: 0 auto;
		transform: translateY(-50%);
		padding: 32px;
		text-align: center;
		font-size: 14px;
	}
}
</style>
