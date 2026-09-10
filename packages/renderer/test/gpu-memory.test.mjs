import assert from 'node:assert/strict';
import test from 'node:test';
import { GpuMemoryTracker } from '../src/GpuMemoryTracker.ts';

function createDevice() {
	const device = {
		createTexture({ size, format, dimension = '2d', mipLevelCount = 1, sampleCount = 1 }) {
			assert.equal(this, device);
			const [width, height = 1, depthOrArrayLayers = 1] = Array.isArray(size) ? size : [size.width, size.height, size.depthOrArrayLayers];
			return { width, height, depthOrArrayLayers, format, dimension, mipLevelCount, sampleCount, destroy() { this.destroyCalls = (this.destroyCalls ?? 0) + 1; } };
		},
		createBuffer({ size }) {
			assert.equal(this, device);
			if (size < 0) throw new Error('invalid size');
			return { size, destroy() { this.destroyCalls = (this.destroyCalls ?? 0) + 1; } };
		},
		destroy() { assert.equal(this, device); },
		lost: new Promise(() => {}),
	};
	return device;
}

test('estimates texture formats, mip levels, arrays, volumes and samples', () => {
	for (const [descriptor, expected] of [
		[{ size: [1920, 1080], format: 'bgra8unorm' }, 8294400],
		[{ size: [4, 2], format: 'rgba16float' }, 64],
		[{ size: [4, 2], format: 'rgba32float' }, 128],
		[{ size: [8, 4, 6], format: 'rgba8unorm-srgb', mipLevelCount: 4 }, 1032],
		[{ size: { width: 8, height: 4, depthOrArrayLayers: 4 }, format: 'r8unorm', dimension: '3d', mipLevelCount: 4 }, 147],
		[{ size: [4, 2], format: 'rgba8unorm', sampleCount: 4 }, 128],
		[{ size: [8, 8], format: 'bc1-rgba-unorm', mipLevelCount: 4 }, 56],
		[{ size: [10, 5], format: 'astc-5x4-unorm' }, 64],
		[{ size: [4, 2], format: 'rgb10a2unorm' }, 32],
	]) {
		const device = createDevice();
		const tracker = new GpuMemoryTracker(device);
		const texture = device.createTexture(descriptor);
		assert.deepEqual(tracker.getUsage(), { textures: expected, buffers: 0, total: expected }, JSON.stringify(descriptor));
		texture.destroy();
		assert.equal(tracker.getUsage().total, 0);
	}
});

test('tracks creation and destruction without double subtraction or cross-device accounting', () => {
	const device = createDevice();
	const tracker = new GpuMemoryTracker(device);
	const otherDevice = createDevice();
	const other = new GpuMemoryTracker(otherDevice);
	const texture = device.createTexture({ size: [4, 4], format: 'rgba8unorm' });
	const buffer = device.createBuffer({ size: 1024 });
	otherDevice.createBuffer({ size: 32 });
	assert.deepEqual(tracker.getUsage(), { textures: 64, buffers: 1024, total: 1088 });
	assert.equal(other.getUsage().total, 32);
	assert.throws(() => device.createBuffer({ size: -1 }), /invalid size/);
	assert.equal(tracker.getUsage().total, 1088);
	texture.destroy();
	texture.destroy();
	assert.equal(texture.destroyCalls, 2);
	assert.deepEqual(tracker.getUsage(), { textures: 0, buffers: 1024, total: 1024 });
	device.destroy();
	buffer.destroy();
	assert.equal(buffer.destroyCalls, 1);
	assert.equal(tracker.getUsage().total, 0);
	assert.equal(other.getUsage().total, 32);
});

test('device loss clears estimates without later destruction making them negative', async () => {
	const device = createDevice();
	const { promise, resolve } = Promise.withResolvers();
	device.lost = promise;
	const tracker = new GpuMemoryTracker(device);
	const buffer = device.createBuffer({ size: 1024 });
	resolve({ reason: 'unknown' });
	await promise;
	assert.deepEqual(tracker.getUsage(), { textures: 0, buffers: 0, total: 0 });
	buffer.destroy();
	assert.equal(tracker.getUsage().total, 0);
});
