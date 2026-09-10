struct Params {
	mode: u32,
	gain: f32,
	threshold: f32,
};

@group(0) @binding(0) var source: texture_2d<f32>;
@group(1) @binding(0) var previous: texture_2d<f32>;
@group(1) @binding(1) var<uniform> params: Params;

fn readInput(uv: vec2f) -> vec3f {
	let size = textureDimensions(source);
	let normalized = vec2f(uv.x, -uv.y) * 0.5 + 0.5;
	let coord = clamp(vec2i(normalized * vec2f(size)), vec2i(0), vec2i(size) - 1);
	let color = textureLoad(source, coord, 0);
	// Compare appearance over black: invisible RGB contributes nothing, alpha changes remain visible.
	return color.rgb * clamp(color.a, 0.0, 1.0);
}

@fragment
fn capture(@location(0) uv: vec2f) -> @location(0) vec4f {
	return vec4f(readInput(uv), 1.0);
}

@fragment
fn difference(@location(0) uv: vec2f, @builtin(position) position: vec4f) -> @location(0) vec4f {
	let current = readInput(uv);
	let before = textureLoad(previous, vec2i(position.xy), 0).rgb;
	var delta = abs(current - before);
	if (params.mode == 1u) {
		let weights = vec3f(0.2126, 0.7152, 0.0722);
		delta = vec3f(abs(dot(current, weights) - dot(before, weights)));
	}
	return vec4f(clamp((delta - params.threshold) * params.gain, vec3f(0.0), vec3f(1.0)), 1.0);
}
