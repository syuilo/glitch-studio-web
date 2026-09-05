
fn premultiplyAlpha(color: vec4f) -> vec4f {
	return vec4f(color.rgb * color.a, color.a);
}

// テクスチャ座標(0~1、+Yが下)に変換
fn convertTexCoords(uv: vec2f) -> vec2f {
	return vec2f(uv.x, -uv.y) * 0.5 + vec2f(0.5);
}

struct Uniforms {
	v: f32,
};

@group(0) @binding(1) var<uniform> uniforms: Uniforms;
@group(0) @binding(2) var sourceTexture: texture_2d<f32>;

struct FragmentIn {
	@location(0) uv: vec2f,
};

@fragment
fn fs(fragData: FragmentIn) -> @location(0) vec4f {
		let size = textureDimensions(sourceTexture, 0);
	let maxCoord = vec2<i32>(size) - vec2<i32>(1);

	let coord = clamp(
		vec2<i32>((vec2f(fragData.uv.x, -fragData.uv.y) + vec2<f32>(1)) * vec2<f32>(size) / 2.0),
		vec2<i32>(0),
		maxCoord,
	);

	let uv = convertTexCoords(fragData.uv);
	var color = textureLoad(sourceTexture, coord, 0);
	color.r *= uniforms.v;
	color.g *= uniforms.v;
	color.b *= uniforms.v;
	return premultiplyAlpha(color);
}
