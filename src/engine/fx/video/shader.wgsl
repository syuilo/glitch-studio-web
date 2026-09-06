
fn premultiplyAlpha(color: vec4f) -> vec4f {
	return vec4f(color.rgb * color.a, color.a);
}

// テクスチャ座標(0~1、+Yが下)に変換
fn convertTexCoords(uv: vec2f) -> vec2f {
	return vec2f(uv.x, -uv.y) * 0.5 + vec2f(0.5);
}

struct Uniforms {
	aspectRatio: f32,
	sourceAspectRatio: f32,
	mode: u32, // 0: stretch, 1: cover, 2: contain
};

@group(0) @binding(1) var<uniform> uniforms: Uniforms;
@group(0) @binding(2) var mySampler: sampler;
@group(0) @binding(3) var sourceTexture: texture_2d<f32>;

struct FragmentIn {
	@location(0) uv: vec2f,
};

@fragment
fn fs(fragData: FragmentIn) -> @location(0) vec4f {
	let uv = fragData.uv;
	let sourceScale = select(
		select(1.0, uniforms.sourceAspectRatio / uniforms.aspectRatio, uniforms.sourceAspectRatio < uniforms.aspectRatio),
		select(1.0, uniforms.sourceAspectRatio / uniforms.aspectRatio, uniforms.sourceAspectRatio > uniforms.aspectRatio),
		uniforms.mode == 1) * min(1.0, uniforms.aspectRatio);
	let sourceUvScale = vec2f(1.0, uniforms.sourceAspectRatio) / sourceScale;
	var sourceUv = select(uv, uv * sourceUvScale, uniforms.mode != 0);
	let color = textureSample(sourceTexture, mySampler, convertTexCoords(sourceUv));
	return premultiplyAlpha(color);
}

