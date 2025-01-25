#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
out vec4 out_color;
uniform float u_size;

void main() {
	//if (mod(u_size, 2.) > 0.) {
	//	u_size += 1.;
	//}
	if (u_size > 0.0) {
		float dx = u_size / 1.0;
		float dy = u_size / 1.0;
		vec2 new_uv = vec2(
			(dx * (floor((in_uv.x - 0.5 - (dx / 2.0)) / dx) + 0.5)),
			(dy * (floor((in_uv.y - 0.5 - (dy / 2.0)) / dy) + 0.5))
		) + vec2(0.5 + (dx / 2.0), 0.5 + (dy / 2.0));
		out_color = vec4(texture(u_texture, new_uv).rgb, 1.);
	} else {
		out_color = vec4(texture(u_texture, in_uv).rgb, 1.);
	}
}
