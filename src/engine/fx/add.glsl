#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture_a;
uniform sampler2D u_texture_b;
out vec4 out_color;

void main() {
	vec4 a = texture(u_texture_a, in_uv);
	vec4 b = texture(u_texture_b, in_uv);
	out_color = mix(a, b, b.a);
	out_color.a = a.a;
}
