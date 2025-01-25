#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform sampler2D u_map;
uniform vec2 u_resolution;
uniform float u_divisions;
out vec4 out_color;

void main() {
	vec4 v = texture(u_map, in_uv);
	float x = in_uv.x + v.a;
	vec4 pixel = texture(u_texture, vec2(x, in_uv.y));
	out_color = pixel;
}
