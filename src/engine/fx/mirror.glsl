#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform bool u_h;
uniform bool u_v;
out vec4 out_color;

void main() {
	vec4 pixel = texture(u_texture, in_uv);
	vec2 uv = in_uv;
	if (u_h && in_uv.x > 0.5) {
		uv.x = 1.0 - uv.x;
	}
	if (u_v && in_uv.y > 0.5) {
		uv.y = 1.0 - uv.y;
	}
	out_color = texture(u_texture, uv);
}
