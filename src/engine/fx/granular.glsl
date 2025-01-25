#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
out vec4 out_color;
uniform int amount;
uniform float shiftStrengths[256];
uniform vec2 shiftOrigins[256];
uniform vec2 shiftSizes[256];
uniform float channelShift;

void main() {
	// TODO: ピクセル毎に計算する必要はないのでuniformにする
	float aspect_ratio = min(u_resolution.x, u_resolution.y) / max(u_resolution.x, u_resolution.y);
	float aspect_ratio_x = u_resolution.x > u_resolution.y ? 1.0 : aspect_ratio;
	float aspect_ratio_y = u_resolution.x < u_resolution.y ? 1.0 : aspect_ratio;

	float v = 0.0;

	for (int i = 0; i < amount; i++) {
		if (
			in_uv.x * aspect_ratio_x > ((shiftOrigins[i].x * aspect_ratio_x) - shiftSizes[i].x) &&
			in_uv.x * aspect_ratio_x < ((shiftOrigins[i].x * aspect_ratio_x) + shiftSizes[i].x) &&
			in_uv.y * aspect_ratio_y > ((shiftOrigins[i].y * aspect_ratio_y) - shiftSizes[i].y) &&
			in_uv.y * aspect_ratio_y < ((shiftOrigins[i].y * aspect_ratio_y) + shiftSizes[i].y)
		) {
			v += shiftStrengths[i];
		}
	}

	float r = texture(u_texture, vec2(in_uv.x + (v * (1.0 + channelShift)), in_uv.y)).r;
	float g = texture(u_texture, vec2(in_uv.x + v, in_uv.y)).g;
	float b = texture(u_texture, vec2(in_uv.x + (v * (1.0 + (channelShift / 2.0))), in_uv.y)).b;
	float a = texture(u_texture, vec2(in_uv.x + v, in_uv.y)).a;
	out_color = vec4(r, g, b, a);
}
