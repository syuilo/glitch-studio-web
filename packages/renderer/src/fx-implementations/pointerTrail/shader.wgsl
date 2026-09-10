
fn premultiplyAlpha(color: vec4f) -> vec4f {
	return vec4f(color.rgb * color.a, color.a);
}

// テクスチャ座標(0~1、+Yが下)に変換
fn convertTexCoords(uv: vec2f) -> vec2f {
	return vec2f(uv.x, -uv.y) * 0.5 + vec2f(0.5);
}

struct Uniforms {
	aspectRatio: f32,
	timeDelta: f32,
	pointerPosition: vec2f,
	pointerVector: vec2f,
};

@group(0) @binding(1) var<uniform> uniforms: Uniforms;
@group(0) @binding(2) var sourceTexture: texture_2d<f32>;

struct FragmentIn {
	@location(0) uv: vec2f,
};

fn scaleUvToCoverGivenAspectRatio(uv: vec2f, aspectRatio: f32) -> vec2f {
	return uv / vec2f(1.0, aspectRatio) * select(1.0, aspectRatio, 1.0 > aspectRatio);
}

fn unscaleUvToCoverGivenAspectRatio(uv: vec2f, aspectRatio: f32) -> vec2f {
	return uv * vec2f(1.0, aspectRatio) / select(1.0, aspectRatio, 1.0 > aspectRatio);
}

fn getPointerForceVector(uv: vec2f) -> vec2f {
	if (uniforms.pointerPosition.x <= -999.0 && uniforms.pointerPosition.y <= -999.0) {
		return vec2f(0.0);
	}

	var v = vec2f(0.0);
	let radius = 0.3;

	let pos = scaleUvToCoverGivenAspectRatio(uniforms.pointerPosition, uniforms.aspectRatio);
	let d = distance(uv, pos);
	if (d < radius) {
		let gradate = 1.0 - (d / radius);
		v = (gradate * gradate) * (uniforms.pointerVector * 32.0);
	}

	return v;
}

@fragment
fn fs(fragData: FragmentIn) -> @location(0) vec2f {
	let size = textureDimensions(sourceTexture, 0);
	let maxCoord = vec2<i32>(size) - vec2<i32>(1);

	let coord = clamp(
		vec2<i32>((vec2f(fragData.uv.x, -fragData.uv.y) + vec2<f32>(1)) * vec2<f32>(size) / 2.0),
		vec2<i32>(0),
		maxCoord,
	);

	let uv = convertTexCoords(fragData.uv);
	var before = textureLoad(sourceTexture, coord, 0).rg;
	before *= exp2(-uniforms.timeDelta / 300.0);
	let v = getPointerForceVector(uv) * 0.3;
	return before + v;
}
