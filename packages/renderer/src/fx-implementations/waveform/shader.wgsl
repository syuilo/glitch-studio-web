struct Params {
	mode: u32,
	intensity: f32,
	size: vec2u,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var source: texture_2d<f32>;
@group(0) @binding(2) var<storage, read_write> counts: array<atomic<u32>>;
@group(0) @binding(3) var<storage, read> waveform: array<u32>;
@group(0) @binding(4) var sourceSampler: sampler;

fn index(column: u32, level: u32, channel: u32) -> u32 {
	return (level * params.size.x + column) * 3u + channel;
}

fn addSample(column: u32, value: f32, channel: u32, weight: f32) {
	let level = clamp(value, 0.0, 1.0) * f32(params.size.y - 1u);
	// Cover at least one 8-bit step to fill quantization gaps at high resolutions.
	let radius = max(1.0, f32(params.size.y - 1u) / 255.0);
	let first = u32(max(0.0, ceil(level - radius)));
	let last = u32(min(f32(params.size.y - 1u), floor(level + radius)));
	var total = 0.0;
	for (var row = first; row <= last; row++) {
		total += max(0.0, 1.0 - abs(f32(row) - level) / radius);
	}
	// Normalize at the ends too, preserving the contribution of black and white.
	for (var row = first; row <= last; row++) {
		let coverage = max(0.0, 1.0 - abs(f32(row) - level) / radius);
		atomicAdd(&counts[index(column, row, channel)], u32(round(weight * coverage / total)));
	}
}

@compute @workgroup_size(16, 16)
fn accumulate(@builtin(global_invocation_id) id: vec3u) {
	if (any(id.xy >= params.size)) {
		return;
	}
	let uv = (vec2f(id.xy) + 0.5) / vec2f(params.size);
	let color = textureSampleLevel(source, sourceSampler, uv, 0.0);
	let weight = clamp(color.a, 0.0, 1.0) * 65535.0;
	if (weight == 0.0) {
		return;
	}
	if (params.mode == 1u) {
		let luminance = dot(color.rgb, vec3f(0.2126, 0.7152, 0.0722));
		addSample(id.x, luminance, 0u, weight);
	} else {
		addSample(id.x, color.r, 0u, weight);
		addSample(id.x, color.g, 1u, weight);
		addSample(id.x, color.b, 2u, weight);
	}
}

fn density(column: u32, level: u32) -> vec3f {
	let offset = index(column, level, 0u);
	let rgb = vec3f(f32(waveform[offset]), f32(waveform[offset + 1u]), f32(waveform[offset + 2u]));
	// Level count and samples per column match, so their normalization cancels.
	return select(rgb, vec3f(rgb.r), params.mode == 1u) / 65535.0;
}

@fragment
fn fs(@location(0) uv: vec2f) -> @location(0) vec4f {
	// Shared UVs run from -1 to 1, with positive Y at the top.
	let position = clamp((uv * 0.5 + 0.5) * vec2f(params.size) - 0.5,
		vec2f(0.0), vec2f(params.size - vec2u(1u)));
	let lower = vec2u(floor(position));
	let upper = min(lower + vec2u(1u), params.size - vec2u(1u));
	let fraction = fract(position);
	let value = mix(
		mix(density(lower.x, lower.y), density(upper.x, lower.y), fraction.x),
		mix(density(lower.x, upper.y), density(upper.x, upper.y), fraction.x),
		fraction.y,
	);
	return vec4f(vec3f(1.0) - exp(-value * params.intensity), 1.0);
}
