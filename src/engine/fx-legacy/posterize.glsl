#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
out vec4 out_color;
uniform float u_threshold;
uniform bool u_r;
uniform bool u_g;
uniform bool u_b;
uniform bool u_a;

float map(float val, float s1, float e1, float s2, float e2) {
  return s2 + (e2 - s2) * ((val - s1) / (e1 - s1));
}

float posterize(float v) {
  float m = map(v, 0.0, 1.0, 0.0, u_threshold);
  float f = floor(m) / (u_threshold - 1.0);
  return f;
}

void main() {
	vec4 pixel = texture(u_texture, in_uv);
	out_color = vec4(
		u_r ? posterize(pixel.r) : pixel.r,
		u_g ? posterize(pixel.g) : pixel.g,
		u_b ? posterize(pixel.b) : pixel.b,
		u_a ? posterize(pixel.a) : pixel.a);
}
