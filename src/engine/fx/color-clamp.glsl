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
uniform float aMin;
uniform float aMax;

void main() {
	vec4 pixel = texture(u_texture, in_uv);
	float r = min(max(pixel.r, rMin), rMax);
	float g = min(max(pixel.g, gMin), gMax);
	float b = min(max(pixel.b, bMin), bMax);
	float a = min(max(pixel.a, aMin), aMax);
	out_color = vec4(r, g, b, a);
}
