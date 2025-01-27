#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
out vec4 out_color;
uniform int amount;
uniform float shiftStrengths[128];
uniform float shiftOrigins[128];
uniform float shiftHeights[128];
uniform float channelShift;

void main() {
	float v = 0.0;

	for (int i = 0; i < amount; i++) {
		if (in_uv.y > (shiftOrigins[i] - shiftHeights[i]) && in_uv.y < (shiftOrigins[i] + shiftHeights[i])) {
			v += shiftStrengths[i];
		}
	}

	float r = texture(u_texture, vec2(in_uv.x + (v * (1.0 + channelShift)), in_uv.y)).r;
	float g = texture(u_texture, vec2(in_uv.x + v, in_uv.y)).g;
	float b = texture(u_texture, vec2(in_uv.x + (v * (1.0 + (channelShift / 2.0))), in_uv.y)).b;
	float a = texture(u_texture, vec2(in_uv.x + v, in_uv.y)).a;
	out_color = vec4(r, g, b, a);
}
