#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
out vec4 out_color;
uniform float rMin;
uniform float rMax;
uniform float gMin;
uniform float gMax;
uniform float bMin;
uniform float bMax;

void main() {
	vec4 pixel = texture(u_texture, in_uv);
	float r = pixel.r < rMin ? 0.0 : pixel.r > rMax ? 1.0 : pixel.r;
	float g = pixel.g < gMin ? 0.0 : pixel.g > gMax ? 1.0 : pixel.g;
	float b = pixel.b < bMin ? 0.0 : pixel.b > bMax ? 1.0 : pixel.b;
	out_color = vec4(r, g, b, pixel.a);
}
