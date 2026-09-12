import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.GPUQueue = class { submit(commandBuffers) { Array.from(commandBuffers); } };
globalThis.GPUBufferUsage = { QUERY_RESOLVE: 1, COPY_SRC: 2, COPY_DST: 4, MAP_READ: 8 };
globalThis.GPUMapMode = { READ: 1 };

const { default: TimingHelper } = await import('../src/utility/TimingHelper.ts');

test('timing handles frames without measured passes and resumes measurement', async () => {
	const device = {
		features: new Set(['timestamp-query']),
		createQuerySet: descriptor => descriptor,
		createBuffer: ({ size }) => ({
			size,
			async mapAsync() {},
			getMappedRange: () => new BigUint64Array([10n, 40n, 50n, 70n]).buffer,
			unmap() {},
		}),
	};
	const timing = new TimingHelper(device);
	const queue = new GPUQueue();

	assert.equal(await timing.getResult(), 0);
	for (let frame = 0; frame < 2; frame++) {
		const encoder = {
			beginRenderPass() { return { end() {} }; },
			beginComputePass() { return { end() {} }; },
			resolveQuerySet() {},
			copyBufferToBuffer() {},
			finish() { return {}; },
		};
		timing.beginRenderPass(encoder, { colorAttachments: [] }).end();
		timing.beginComputePass(encoder).end();
		await assert.rejects(timing.getResult(), /you must call encoder.finish and submit/);
		const buffer = encoder.finish();
		await assert.rejects(timing.getResult(), /you must submit the command buffer/);
		queue.submit(frame === 0 ? [buffer] : (function* () { yield buffer; })());
		assert.equal(await timing.getResult(), 50);
		assert.equal(await timing.getResult(), 0);
		assert.equal(await timing.getResult(), 0);
	}
});
