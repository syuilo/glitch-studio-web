#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture_a;
uniform sampler2D u_texture_b;
uniform sampler2D u_texture_mask;
uniform int u_mode;
out vec4 out_color;

void main() {
	vec4 a = texture(u_texture_a, in_uv);
	vec4 b = texture(u_texture_b, in_uv);
	vec4 mask = texture(u_texture_mask, in_uv);
	float u_mix = (mask.r + mask.g + mask.b) / 3.0;
	if (u_mode == 0) { // normal
		out_color = mix(a, b, u_mix);
	} else if (u_mode == 1) { // add
		out_color = min(a + b, vec4(1.0)) * u_mix + a * (1.0 - u_mix);
	} else if (u_mode == 2) { // subtract
		out_color = max(a + b - vec4(1.0), vec4(0.0)) * u_mix + a * (1.0 - u_mix);
	} 
}
