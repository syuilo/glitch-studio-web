// https://webgpufundamentals.org/webgpu/lessons/webgpu-timing.html

function assert(cond, msg = '') {
	if (!cond) {
		throw new Error(msg);
	}
}

// We track command buffers so we can generate an error if
// we try to read the result before the command buffer has been executed.
const s_unsubmittedCommandBuffer = new Set();

const MAX_PASSES = 16;

/* global GPUQueue */
GPUQueue.prototype.submit = (function(origFn) {
	return function(commandBuffers) {
		origFn.call(this, commandBuffers);
		commandBuffers.forEach(cb => s_unsubmittedCommandBuffer.delete(cb));
	};
})(GPUQueue.prototype.submit);

// See https://webgpufundamentals.org/webgpu/lessons/webgpu-timing.html
export default class TimingHelper {
	#canTimestamp;
	#device;
	#querySet;
	#resolveBuffer;
	#resultBuffer;
	#commandBuffer;
	#commandEncoder;
	#passCount = 0;
	#resultBuffers = [];
	// state can be 'free', 'recording', 'need finish', 'wait for result'
	#state = 'free';

	constructor(device) {
		this.#device = device;
		this.#canTimestamp = device.features.has('timestamp-query');
		if (this.#canTimestamp) {
			this.#querySet = device.createQuerySet({
				type: 'timestamp',
				count: MAX_PASSES * 2,
			});
			this.#resolveBuffer = device.createBuffer({
				size: this.#querySet.count * 8,
				usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
			});
		}
	}

	#beginTimestampPass(encoder, fnName, descriptor) {
		if (this.#canTimestamp) {
			if (this.#state === 'free') {
				this.#state = 'recording';
				this.#commandEncoder = encoder;

				const resolve = () => this.#resolveTiming(encoder);
				const trackCommandBuffer = (cb) => this.#trackCommandBuffer(cb);
				encoder.finish = (function(origFn) {
					return function() {
						resolve();
						const cb = origFn.call(this);
						trackCommandBuffer(cb);
						return cb;
					};
				})(encoder.finish);
			} else {
				assert(this.#state === 'recording', 'state not recording');
				assert(this.#commandEncoder === encoder, 'all measured passes must use the same command encoder');
			}

			assert(this.#passCount < MAX_PASSES, `cannot measure more than ${MAX_PASSES} passes per command encoder`);
			const beginningOfPassWriteIndex = this.#passCount * 2;
			this.#passCount++;

			return encoder[fnName]({
				...descriptor,
				timestampWrites: {
					querySet: this.#querySet,
					beginningOfPassWriteIndex,
					endOfPassWriteIndex: beginningOfPassWriteIndex + 1,
				},
			});
		} else {
			return encoder[fnName](descriptor);
		}
	}

	beginRenderPass(encoder, descriptor = {}) {
		return this.#beginTimestampPass(encoder, 'beginRenderPass', descriptor);
	}

	beginComputePass(encoder, descriptor = {}) {
		return this.#beginTimestampPass(encoder, 'beginComputePass', descriptor);
	}

	#trackCommandBuffer(cb) {
		if (!this.#canTimestamp) {
			return;
		}
		assert(this.#state === 'need finish', 'you must call encoder.finish');
		this.#commandBuffer = cb;
		s_unsubmittedCommandBuffer.add(cb);
		this.#state = 'wait for result';
	}

	#resolveTiming(encoder) {
		if (!this.#canTimestamp) {
			return;
		}
		assert(
			this.#state === 'recording',
			'you must use timerHelper.beginComputePass or timerHelper.beginRenderPass',
		);
		assert(this.#commandEncoder === encoder, 'all measured passes must use the same command encoder');
		this.#state = 'need finish';

		this.#resultBuffer = this.#resultBuffers.pop() || this.#device.createBuffer({
			size: this.#resolveBuffer.size,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
		});

		const queryCount = this.#passCount * 2;
		encoder.resolveQuerySet(this.#querySet, 0, queryCount, this.#resolveBuffer, 0);
		encoder.copyBufferToBuffer(this.#resolveBuffer, 0, this.#resultBuffer, 0, queryCount * 8);
	}

	async getResult() {
		if (!this.#canTimestamp) {
			return 0;
		}
		assert(
			this.#state === 'wait for result',
			'you must call encoder.finish and submit the command buffer before you can read the result',
		);
		assert(!!this.#commandBuffer); // internal check
		assert(
			!s_unsubmittedCommandBuffer.has(this.#commandBuffer),
			'you must submit the command buffer before you can read the result',
		);
		const queryCount = this.#passCount * 2;
		this.#commandBuffer = undefined;
		this.#commandEncoder = undefined;
		this.#passCount = 0;
		this.#state = 'free';

		const resultBuffer = this.#resultBuffer;
		await resultBuffer.mapAsync(GPUMapMode.READ);
		const times = new BigUint64Array(resultBuffer.getMappedRange());
		let duration = 0n;
		for (let i = 0; i < queryCount; i += 2) {
			const passDuration = times[i + 1] - times[i];
			if (passDuration < 0n) {
				duration = passDuration;
				break;
			}
			duration += passDuration;
		}
		resultBuffer.unmap();
		this.#resultBuffers.push(resultBuffer);
		return Number(duration);
	}
}
