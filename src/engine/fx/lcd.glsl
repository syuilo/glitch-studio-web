#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_size;
uniform float u_border;
out vec4 out_color;

void main() {
	// TODO: ピクセル毎に計算する必要はないのでuniformにする
	float aspect_ratio = min(u_resolution.x, u_resolution.y) / max(u_resolution.x, u_resolution.y);
	float aspect_ratio_x = u_resolution.x > u_resolution.y ? 1.0 : aspect_ratio;
	float aspect_ratio_y = u_resolution.x < u_resolution.y ? 1.0 : aspect_ratio;

	bool pixelate = true;
	vec4 color = texture(u_texture, in_uv);
	vec3 rgb = color.rgb;
	float dot_size = 1.0 / u_size;
	float dot_size_1of3 = dot_size / 3.0;
	float mod_x = mod((in_uv.x - 0.5), dot_size);
	float mod_y = mod((in_uv.y - 0.5), dot_size);
	if (pixelate) {
		// TODO: ちゃんと平均を採る
		vec4 avg = texture(u_texture, vec2(
			dot_size * floor((in_uv.x - 0.5) / dot_size) + (dot_size / 2.0),
			dot_size * floor((in_uv.y - 0.5) / dot_size) + (dot_size / 2.0)
		) + vec2(0.5, 0.5));
		if (((dot_size) - mod_x) < dot_size_1of3 * 1.0) {
			rgb.r = 0.0;
			rgb.g = 0.0;
			rgb.b = avg.b;
		} else if (((dot_size) - mod_x) < dot_size_1of3 * 2.0) {
			rgb.r = 0.0;
			rgb.g = avg.g;
			rgb.b = 0.0;
		} else if (((dot_size) - mod_x) < dot_size_1of3 * 3.0) {
			rgb.r = avg.r;
			rgb.g = 0.0;
			rgb.b = 0.0;
		}
	} else {
		if (((dot_size) - mod_x) < dot_size_1of3 * 1.0) {
			rgb.r *= 0.0;
			rgb.g *= 0.0;
			rgb.b *= 1.0;
		} else if (((dot_size) - mod_x) < dot_size_1of3 * 2.0) {
			rgb.r *= 0.0;
			rgb.g *= 1.0;
			rgb.b *= 0.0;
		} else if (((dot_size) - mod_x) < dot_size_1of3 * 3.0) {
			rgb.r *= 1.0;
			rgb.g *= 0.0;
			rgb.b *= 0.0;
		}
	}
	//if (mod(xy.y, dot_size) < dot_size_1of3 / 2.0) {
	//	discard;
	//}

	vec2 nUv = vec2(fract((in_uv.x - 0.5) * (u_size * 3.0)), fract((in_uv.y - 0.5) * u_size));
	vec2 lWidth = vec2(dot_size * (u_border / 2.0 / 3.0));
	vec2 uvAbs = abs(nUv - 0.5);
	float s = step(0.5 - uvAbs.x, lWidth.x * (u_size * 3.0)) + step(0.5 - uvAbs.y, lWidth.y * u_size);

	rgb -= s;

	out_color = vec4(rgb, 1.0);
}
