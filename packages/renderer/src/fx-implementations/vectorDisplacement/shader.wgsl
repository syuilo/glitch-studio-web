struct Params {
	amount: f32,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var sourceSampler: sampler;
@group(0) @binding(2) var source: texture_2d<f32>;
@group(0) @binding(3) var vector: texture_2d<f32>;
@group(0) @binding(4) var vectorSampler: sampler;

@fragment
fn fs(@location(0) uv: vec2f) -> @location(0) vec4f {
	let coord = vec2f(uv.x, -uv.y) * 0.5 + 0.5;
	let displacement = textureSampleLevel(vector, vectorSampler, coord, 0.0).rg;
	// Backward sampling moves the displayed image along the signed vector field.
	let color = textureSampleLevel(source, sourceSampler, coord - displacement * params.amount, 0.0);
	return vec4f(color.rgb * color.a, color.a);
}
