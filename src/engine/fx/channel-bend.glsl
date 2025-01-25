#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float phase;
uniform float frequency;
uniform float strength;
uniform bool mix;
out vec4 out_color;

void main() {
	vec4 pixel = texture(u_texture, in_uv);

	float rgbDiff = (6.0 + sin(phase + in_uv.y * frequency) * (20.0 * strength + 1.0)) / u_resolution.x;

	float bnR = texture(u_texture, vec2(in_uv.x + rgbDiff, in_uv.y)).r;
	float bnG = texture(u_texture, vec2(in_uv.x, in_uv.y)).g;
	float bnB = texture(u_texture, vec2(in_uv.x - rgbDiff, in_uv.y)).b;
	vec4 effected = vec4(bnR, bnG, bnB, 1.0);

	out_color = mix ? max(pixel, effected) : effected;
}
