#version 300 es
precision highp float;

in vec2 in_uv;
uniform vec2 u_pos;
uniform vec2 u_size;
out vec4 out_color;

void main() {
	out_color = vec4(vec3(1.0 - distance(in_uv / u_size, u_pos / u_size)), 1.0);
}
