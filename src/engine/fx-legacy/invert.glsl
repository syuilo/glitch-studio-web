#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform bool u_r;
uniform bool u_g;
uniform bool u_b;
uniform bool u_a;
out vec4 out_color;

void main() {
	vec4 pixel = texture(u_texture, in_uv);
	out_color.r = u_r ? 1.0 - pixel.r : pixel.r;
	out_color.g = u_g ? 1.0 - pixel.g : pixel.g;
	out_color.b = u_b ? 1.0 - pixel.b : pixel.b;
	out_color.a = u_a ? 1.0 - pixel.a : pixel.a;
}
