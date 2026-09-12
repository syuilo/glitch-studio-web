struct Uniforms {
	aspectRatio: f32,
	fitA: u32,
	fitB: u32,
	fitAmount: u32,
	blendMode: u32,
};
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var inputA: texture_2d<f32>;
@group(0) @binding(2) var inputB: texture_2d<f32>;
@group(0) @binding(3) var amountTexture: texture_2d<f32>;

// 入力ごとの実寸から比率を求める。stretch以外は縦横を同じ倍率で拡大縮小する。
fn fittedSample(tex: texture_2d<f32>, position: vec2f, mode: u32) -> vec4f {
	let size = vec2f(textureDimensions(tex));
	let ratio = (size.x / size.y) / uniforms.aspectRatio;
	var scale = vec2f(1.0);
	if (mode == 1u) { scale = vec2f(min(1.0, 1.0 / ratio), min(1.0, ratio)); }
	if (mode == 2u) { scale = vec2f(max(1.0, 1.0 / ratio), max(1.0, ratio)); }
	let uv = (position - 0.5) * scale + 0.5;
	// containの余白は画像なら透明、データなら全成分0。端を引き延ばさない。
	if (mode == 2u && (any(uv < vec2f(0.0)) || any(uv > vec2f(1.0)))) { return vec4f(0.0); }

	// 手動の双線形補間により、32bit精度を保ちつつfloat32-filterableを不要にする。
	let pixel = uv * size - 0.5;
	let base = vec2i(floor(pixel));
	let weight = fract(pixel);
	let last = vec2i(size) - 1;
	let c00 = textureLoad(tex, clamp(base, vec2i(0), last), 0);
	let c10 = textureLoad(tex, clamp(base + vec2i(1, 0), vec2i(0), last), 0);
	let c01 = textureLoad(tex, clamp(base + vec2i(0, 1), vec2i(0), last), 0);
	let c11 = textureLoad(tex, clamp(base + vec2i(1, 1), vec2i(0), last), 0);
	return mix(mix(c00, c10, weight.x), mix(c01, c11, weight.x), weight.y);
}

fn blendComponents(a: vec4f, b: vec4f) -> vec4f {
	switch uniforms.blendMode {
		case 1u: { return a + b; }
		case 2u: { return a - b; }
		case 3u: { return a * b; }
		case 4u: { return min(a, b); }
		case 5u: { return max(a, b); }
		case 6u: { return 1.0 - (1.0 - a) * (1.0 - b); }
		case 7u: { return select(1.0 - 2.0 * (1.0 - a) * (1.0 - b), 2.0 * a * b, a <= vec4f(0.5)); }
		case 8u: { return abs(a - b); }
		case 9u: { return a + b - 2.0 * a * b; }
		default: { return b; }
	}
}

@fragment
fn fs(@location(0) position: vec2f) -> @location(0) vec4f {
	let uv = vec2f(position.x, -position.y) * 0.5 + 0.5;
	let a = fittedSample(inputA, uv, uniforms.fitA);
	let b = fittedSample(inputB, uv, uniforms.fitB);
	let amount = clamp(fittedSample(amountTexture, uv, uniforms.fitAmount).r, 0.0, 1.0);
	if (amount == 0.0) { return a; }
	// データの負値・1を超える値・第4成分も保持し、色用のクランプやアルファ合成をしない。
	return mix(a, blendComponents(a, b), amount);
}
