fn premultiplyAlpha(color: vec4f) -> vec4f {
	return vec4f(color.rgb * color.a, color.a);
}

fn convertTexCoords(uv: vec2f) -> vec2f {
	return vec2f(uv.x, -uv.y) * 0.5 + vec2f(0.5);
}

struct Uniforms {
	amount: u32,
	channelShift: f32,
	shifts: array<vec4f, 128>,
};

@group(0) @binding(1) var<uniform> uniforms: Uniforms;
@group(0) @binding(2) var sourceSampler: sampler;
@group(0) @binding(3) var sourceTexture: texture_2d<f32>;

struct FragmentIn {
	@location(0) uv: vec2f,
};

@fragment
fn fs(fragData: FragmentIn) -> @location(0) vec4f {
	let uv = convertTexCoords(fragData.uv);
	var shift = 0.0;

	for (var i = 0u; i < uniforms.amount; i++) {
		let tearing = uniforms.shifts[i];
		if (uv.y > tearing.x - tearing.z && uv.y < tearing.x + tearing.z) {
			shift += tearing.y;
		}
	}

	let center = textureSample(sourceTexture, sourceSampler, uv + vec2f(shift, 0.0));
	let red = textureSample(sourceTexture, sourceSampler, uv + vec2f(shift * (1.0 + uniforms.channelShift), 0.0)).r;
	let blue = textureSample(sourceTexture, sourceSampler, uv + vec2f(shift * (1.0 + uniforms.channelShift / 2.0), 0.0)).b;
	return premultiplyAlpha(vec4f(red, center.g, blue, center.a));
}
