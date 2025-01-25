#version 300 es
precision highp float;

in vec2 in_uv;
out vec4 out_color;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec3 u_color;
uniform float u_alpha;

void main() {
	out_color = vec4(u_color, u_alpha);
}
