#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_position;
out vec4 out_color;

void main() {
	if (in_uv.y > u_position) {
		out_color = texture(u_texture, vec2(in_uv.x, u_position));
	} else {
		out_color = texture(u_texture, in_uv);
	}
}
