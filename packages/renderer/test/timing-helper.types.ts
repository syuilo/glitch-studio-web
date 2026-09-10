import TimingHelper from '../src/TimingHelper.ts';

declare const device: GPUDevice;
declare const encoder: GPUCommandEncoder;

const timing = new TimingHelper(device);
const renderPass = timing.beginRenderPass(encoder, { colorAttachments: [] });
renderPass.draw(6);
// @ts-expect-error Render passes cannot dispatch compute work.
renderPass.dispatchWorkgroups(1);

const computePass = timing.beginComputePass(encoder);
computePass.dispatchWorkgroups(1);
// @ts-expect-error Compute passes cannot draw.
computePass.draw(6);

// @ts-expect-error Render pass descriptors require color attachments.
timing.beginRenderPass(encoder, {});
// @ts-expect-error A device must implement the WebGPU device API.
new TimingHelper({});

const result: Promise<number> = timing.getResult();
