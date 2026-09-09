const PI = 3.141592653589793;
const TWO_PI = 6.283185307179586;
const HALF_PI = 1.5707963267948966;

fn mod289_3(x: vec3f) -> vec3f {
	return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn mod289_4(x: vec4f) -> vec4f {
	return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn permute(x: vec4f) -> vec4f {
	return mod289_4(((x * 34.0) + 10.0) * x);
}

fn taylorInvSqrt(r: vec4f) -> vec4f {
	return 1.79284291400159 - 0.85373472095314 * r;
}

// -1.0 ~ +1.0
fn snoise(v: vec3f) -> f32 {
	const C = vec2f(1.0 / 6.0, 1.0 / 3.0);
	const D = vec4f(0.0, 0.5, 1.0, 2.0);

	var i = floor(v + dot(v, C.yyy));
	var x0 = v - i + dot(i, C.xxx);

	var g = step(x0.yzx, x0.xyz);
	var l = 1.0 - g;
	var i1 = min(g.xyz, l.zxy);
	var i2 = max(g.xyz, l.zxy);

	var x1 = x0 - i1 + C.xxx;
	var x2 = x0 - i2 + C.yyy;
	var x3 = x0 - D.yyy;

	i = mod289_3(i);
	var p = permute(permute(permute(
						i.z + vec4f(0.0, i1.z, i2.z, 1.0))
					+ i.y + vec4f(0.0, i1.y, i2.y, 1.0))
					+ i.x + vec4f(0.0, i1.x, i2.x, 1.0));

	var n_ = 0.142857142857;
	var ns = n_ * D.wyz - D.xzx;

	var j = p - 49.0 * floor(p * ns.z * ns.z);

	var x_ = floor(j * ns.z);
	var y_ = floor(j - 7.0 * x_);

	var x = x_ * ns.x + ns.yyyy;
	var y = y_ * ns.x + ns.yyyy;
	var h = 1.0 - abs(x) - abs(y);

	var b0 = vec4f(x.xy, y.xy);
	var b1 = vec4f(x.zw, y.zw);

	var s0 = floor(b0) * 2.0 + 1.0;
	var s1 = floor(b1) * 2.0 + 1.0;
	var sh = -step(h, vec4f(0.0));

	var a0 = b0.xzyw + s0.xzyw * sh.xxyy;
	var a1 = b1.xzyw + s1.xzyw * sh.zzww;

	var p0 = vec3f(a0.xy, h.x);
	var p1 = vec3f(a0.zw, h.y);
	var p2 = vec3f(a1.xy, h.z);
	var p3 = vec3f(a1.zw, h.w);

	var norm = taylorInvSqrt(vec4f(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
	p0 *= norm.x;
	p1 *= norm.y;
	p2 *= norm.z;
	p3 *= norm.w;

	var m = max(0.5 - vec4f(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), vec4f(0.0));
	m = m * m;
	return 105.0 * dot(m * m, vec4f(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// +0.0 ~ +1.0
fn snoise0to1(v: vec3f) -> f32 {
	return (snoise(v) + 1.0) / 2.0;
}

// equivalent to GLSL's mod function
fn modVec2f(a: vec2f, b: vec2f) -> vec2f {
	return a - b * floor(a / b);
}

fn premultiplyAlpha(color: vec4f) -> vec4f {
	return vec4f(color.rgb * color.a, color.a);
}

// テクスチャ座標(0~1、+Yが下)に変換
fn convertTexCoords(uv: vec2f) -> vec2f {
	return vec2f(uv.x, -uv.y) * 0.5 + vec2f(0.5);
}

struct Uniforms {
	aspectRatio: f32,
	divisions: f32,
	margin: f32,
	symbolTexturesCount: u32,
	symbolTexturesRangeMin: f32,
	symbolTexturesRangeMax: f32,
	useOriginalColor: u32,
	sourceAspectRatio: f32,
	sourceContrast: f32,
	highlightClipThreshold: f32,
	shadowClipThreshold: f32,
	enableClippedAreaFill: u32,
	coverSource: u32,
	bgColor: vec3f,
	colorA: vec3f,
	colorB: vec3f,
	colorC: vec3f,
	similarityThresholdFactor: f32,
	forceFieldShift: u32,
	forceFieldWarp: u32,
};

@group(0) @binding(1) var<uniform> uniforms: Uniforms;
@group(0) @binding(2) var mySampler: sampler;
@group(0) @binding(3) var sourceTexture: texture_2d<f32>;
@group(0) @binding(4) var symbolTextures: texture_2d_array<f32>;
@group(0) @binding(5) var forceFieldTexture: texture_2d<f32>;

// https://docs.arduino.cc/language-reference/en/functions/math/map/
fn remap(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
	return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

fn getPixelatedUv(uv: vec2f, cellSize: vec2f) -> vec2f {
	return (cellSize * floor(uv / cellSize)) + (cellSize / 2.0);
}

fn getSourceColor(uv: vec2f) -> vec4f {
	let sourceScale = select(
		select(1.0, uniforms.sourceAspectRatio / uniforms.aspectRatio, uniforms.sourceAspectRatio < uniforms.aspectRatio),
		select(1.0, uniforms.sourceAspectRatio / uniforms.aspectRatio, uniforms.sourceAspectRatio > uniforms.aspectRatio),
		uniforms.coverSource == 1) * min(1.0, uniforms.aspectRatio);
	let sourceUvScale = vec2f(1.0, uniforms.sourceAspectRatio) / sourceScale;
	var sourceUv = uv * sourceUvScale;
	if (uniforms.forceFieldWarp == 1) {
		sourceUv -= getForceFieldAspectVector(uv) * sourceUvScale;
	}
	let color = textureSample(sourceTexture, mySampler, convertTexCoords(sourceUv));
	return vec4f(pow(color.rgb, vec3f(uniforms.sourceContrast)), color.a);
}

fn getForceFieldAspectVector(aspectUv: vec2f) -> vec2f {
	return scaleUvToCoverGivenAspectRatio(textureSample(forceFieldTexture, mySampler, convertTexCoords(unscaleUvToCoverGivenAspectRatio(aspectUv, uniforms.aspectRatio))).rg, uniforms.aspectRatio);
}

fn isSimilar(a: vec4f, b: vec4f, c: vec4f, d: vec4f, threshold: f32) -> bool {
	return (
		abs(a.r - b.r) < threshold && abs(a.g - b.g) < threshold && abs(a.b - b.b) < threshold &&
		abs(a.r - c.r) < threshold && abs(a.g - c.g) < threshold && abs(a.b - c.b) < threshold &&
		abs(a.r - d.r) < threshold && abs(a.g - d.g) < threshold && abs(a.b - d.b) < threshold
	);
}

fn scaleUvToCoverGivenAspectRatio(uv: vec2f, aspectRatio: f32) -> vec2f {
	return uv / vec2f(1.0, aspectRatio) * select(1.0, aspectRatio, 1.0 > aspectRatio);
}

fn unscaleUvToCoverGivenAspectRatio(uv: vec2f, aspectRatio: f32) -> vec2f {
	return uv * vec2f(1.0, aspectRatio) / select(1.0, aspectRatio, 1.0 > aspectRatio);
}

struct FragmentIn {
	@location(0) uv: vec2f,
};

@fragment
fn fs(fragData: FragmentIn) -> @location(0) vec4f {
	let uv = scaleUvToCoverGivenAspectRatio(fragData.uv, uniforms.aspectRatio);
	var cellSize = vec2f(1.0 / (uniforms.divisions * 0.5));
	var border = uniforms.margin;
	var modUv = modVec2f(uv, cellSize);

	let cellUv2 = getPixelatedUv(uv, cellSize * 2.0);
	let cellOffset2 = cellSize * 0.5;
	let a2 = cellUv2 + vec2f(-cellOffset2.x, -cellOffset2.y);
	let b2 = cellUv2 + vec2f(cellOffset2.x, -cellOffset2.y);
	let c2 = cellUv2 + vec2f(-cellOffset2.x, cellOffset2.y);
	let d2 = cellUv2 + vec2f(cellOffset2.x, cellOffset2.y);
	let sourceColorA2 = getSourceColor(a2);
	let sourceColorB2 = getSourceColor(b2);
	let sourceColorC2 = getSourceColor(c2);
	let sourceColorD2 = getSourceColor(d2);
	let similar2 = isSimilar(sourceColorA2, sourceColorB2, sourceColorC2, sourceColorD2, 0.1 * uniforms.similarityThresholdFactor);

	let cellUv4 = getPixelatedUv(uv, cellSize * 4.0);
	let cellOffset4 = cellSize * 1.5;
	let a4 = cellUv4 + vec2f(-cellOffset4.x, -cellOffset4.y);
	let b4 = cellUv4 + vec2f(cellOffset4.x, -cellOffset4.y);
	let c4 = cellUv4 + vec2f(-cellOffset4.x, cellOffset4.y);
	let d4 = cellUv4 + vec2f(cellOffset4.x, cellOffset4.y);
	let sourceColorA4 = getSourceColor(a4);
	let sourceColorB4 = getSourceColor(b4);
	let sourceColorC4 = getSourceColor(c4);
	let sourceColorD4 = getSourceColor(d4);
	let similar4 = isSimilar(sourceColorA4, sourceColorB4, sourceColorC4, sourceColorD4, 0.025 * uniforms.similarityThresholdFactor);

	if (similar4) {
		modUv = modVec2f(uv, cellSize * 4.0);
		cellSize = cellSize * 4.0;
		border /= 4.0;
	} else if (similar2) {
		modUv = modVec2f(uv, cellSize * 2.0);
		cellSize = cellSize * 2.0;
		border /= 2.0;
	}

	let cellUv = getPixelatedUv(uv, cellSize);

	let sourceColor = getSourceColor(cellUv);
	let sourceColorLuminance = (sourceColor.r + sourceColor.g + sourceColor.b) / 3.0;

	var texSelector = remap(sourceColorLuminance, uniforms.shadowClipThreshold, uniforms.highlightClipThreshold, 0.0, 1.0); // クリップする範囲の分だけ範囲を圧縮する
	texSelector = remap(texSelector, 0.0, 1.0, uniforms.symbolTexturesRangeMin, uniforms.symbolTexturesRangeMax);

	let scale = min(1.0, 1.0 - border);
	let shift = select(vec2f(0.0), -getForceFieldAspectVector(cellUv) * cellSize, uniforms.forceFieldShift == 1);
	let margin = (1.0 - (0.5 + (scale * 0.5))) * cellSize;
	let transformedCoords = ((modUv + shift) - margin) / (cellSize - (margin * 2.0));
	var out_color = textureSample(symbolTextures, mySampler, vec2f(transformedCoords.x, 1.0 - transformedCoords.y), u32(texSelector * f32(uniforms.symbolTexturesCount)));
	if (transformedCoords.x < 0.0 || transformedCoords.x > 1.0 || transformedCoords.y < 0.0 || transformedCoords.y > 1.0) {
		out_color = vec4f(0.0); // 範囲外の参照は無として扱う
	}

	if (sourceColorLuminance > uniforms.highlightClipThreshold) {
		return premultiplyAlpha(vec4f(uniforms.bgColor, 1.0));
	}

	// fill background dots and blocks
	if (uniforms.enableClippedAreaFill == 1) {
		if (sourceColorLuminance < uniforms.shadowClipThreshold * 0.3) {
			return premultiplyAlpha(vec4f(uniforms.bgColor, 1.0));
		} else if (sourceColorLuminance < uniforms.shadowClipThreshold * 0.7) {
			if (distance(modUv / cellSize, vec2(0.5, 0.5)) < 0.05) {
				return premultiplyAlpha(vec4f(mix(uniforms.bgColor, uniforms.colorA, 0.25), 1.0));
			} else {
				return premultiplyAlpha(vec4f(uniforms.bgColor, 1.0));
			}
		} else if (sourceColorLuminance < uniforms.shadowClipThreshold) {
			return premultiplyAlpha(vec4f(mix(uniforms.bgColor, uniforms.colorA, 0.05), 1.0));
		}
	} else {
		if (sourceColorLuminance < uniforms.shadowClipThreshold) {
			return premultiplyAlpha(vec4f(uniforms.bgColor, 1.0));
		}
	}

	let isIn = (
		(modUv.x / cellSize.x) > (1.0 - scale) / 2.0 &&
		(modUv.x / cellSize.x) < 0.5 + (scale / 2.0) &&
		(modUv.y / cellSize.y) > (1.0 - scale) / 2.0 &&
		(modUv.y / cellSize.y) < 0.5 + (scale / 2.0)
	);

	if (!isIn) {
		return premultiplyAlpha(vec4f(vec3f(uniforms.bgColor), 1.0));
	}

	if (uniforms.useOriginalColor == 0) {
		if ((sourceColor.r + sourceColor.g + sourceColor.b) / 3.0 > 0.7) { // apply colorA
			out_color = vec4f(uniforms.colorA.rgb, out_color.a);
		} else if (sourceColor.r > 0.75) { // apply colorC
			out_color = vec4f(uniforms.colorC.rgb, out_color.a);
		} else if (sourceColor.g > 0.4) { // apply colorB
			out_color = vec4f(uniforms.colorB.rgb, out_color.a);
		} else if ((sourceColor.r + sourceColor.g + sourceColor.b) / 3.0 < 0.2) { // apply colorA with lower opacity
			out_color = vec4f(uniforms.colorA.rgb, out_color.a * 0.7);
		} else { // apply colorA
			out_color = vec4f(uniforms.colorA.rgb, out_color.a);
		}
	}

	out_color.r = mix(uniforms.bgColor.r, out_color.r, out_color.a);
	out_color.g = mix(uniforms.bgColor.g, out_color.g, out_color.a);
	out_color.b = mix(uniforms.bgColor.b, out_color.b, out_color.a);
	out_color.a = 1.0;

	return premultiplyAlpha(out_color);
}
