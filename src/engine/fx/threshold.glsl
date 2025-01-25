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

void main() {
	vec4 pixel = texture(u_texture, in_uv);
	out_color = vec4(
		u_r ? (pixel.r > u_threshold ? 1.0 : 0.0) : pixel.r,
		u_g ? (pixel.g > u_threshold ? 1.0 : 0.0) : pixel.g,
		u_b ? (pixel.b > u_threshold ? 1.0 : 0.0) : pixel.b,
		u_a ? (pixel.a > u_threshold ? 1.0 : 0.0) : pixel.a);
}
