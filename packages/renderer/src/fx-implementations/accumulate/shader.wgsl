override MAX_VALUE: f32;

struct Params {
	decay: f32,
	inputWeight: f32,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var source: texture_2d<f32>;
@group(0) @binding(2) var previous: texture_2d<f32>;

@fragment
fn fs(@location(0) uv: vec2f, @builtin(position) position: vec4f) -> @location(0) vec4f {
	var value = vec4f(0.0);
	if (params.decay > 0.0) {
		value = textureLoad(previous, vec2i(position.xy), 0) * params.decay;
	}
	if (params.inputWeight > 0.0) {
		let size = textureDimensions(source);
		let normalized = vec2f(uv.x, -uv.y) * 0.5 + 0.5;
		let coord = clamp(vec2i(normalized * vec2f(size)), vec2i(0), vec2i(size) - 1);
		// Accumulate channels as data, preserving negative vectors and values above one.
		value += textureLoad(source, coord, 0) * params.inputWeight;
	}
	// Saturate only at the storage format's limits, preventing overflow from poisoning history.
	return clamp(value, vec4f(-MAX_VALUE), vec4f(MAX_VALUE));
}
