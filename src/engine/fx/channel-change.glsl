#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform int u_r_to;
uniform int u_g_to;
uniform int u_b_to;
uniform int u_a_to;
out vec4 out_color;

void main() {
	vec4 color = texture(u_texture, in_uv);
	out_color.r = u_r_to == 1 ? color.r : u_g_to == 1 ? color.g : u_b_to == 1 ? color.b : u_a_to == 1 ? color.a : 0.0;
	out_color.g = u_r_to == 2 ? color.r : u_g_to == 2 ? color.g : u_b_to == 2 ? color.b : u_a_to == 2 ? color.a : 0.0;
	out_color.b = u_r_to == 3 ? color.r : u_g_to == 3 ? color.g : u_b_to == 3 ? color.b : u_a_to == 3 ? color.a : 0.0;
	out_color.a = u_r_to == 0 ? color.r : u_g_to == 0 ? color.g : u_b_to == 0 ? color.b : u_a_to == 0 ? color.a : 0.0;
}
