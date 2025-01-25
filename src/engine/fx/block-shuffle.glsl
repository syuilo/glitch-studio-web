#version 300 es
precision highp float;

float random(vec2 c){
	return fract(sin(dot(c.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
out vec4 out_color;
uniform float seed;
uniform float amount;
uniform float shiftAmountMax;
uniform vec2 u_size;

void main() {
	// TODO: ピクセル毎に計算する必要はないのでuniformにする
	float aspect_ratio = min(u_resolution.x, u_resolution.y) / max(u_resolution.x, u_resolution.y);
	float aspect_ratio_x = u_resolution.x > u_resolution.y ? 1.0 : aspect_ratio;
	float aspect_ratio_y = u_resolution.x < u_resolution.y ? 1.0 : aspect_ratio;

	vec4 pixel = texture(u_texture, in_uv);
	float x = (1.0 - u_size.x) * round((in_uv.x - 0.5) / (1.0 - u_size.x));
	float y = (1.0 - u_size.y) * round((in_uv.y - 0.5) / (1.0 - u_size.y));
	float pos_x = 0.5 - (random(vec2(x + seed + 1.0, y + seed + 1.0)) * 1.0);
	float pos_y = 0.5 - (random(vec2(x + seed + 2.0, y + seed + 2.0)) * 1.0);
	vec4 effected = texture(u_texture, vec2(in_uv.x - pos_x, in_uv.y - pos_y));
	out_color = random(vec2(x + seed, y + seed)) < amount ? effected : pixel;
}
