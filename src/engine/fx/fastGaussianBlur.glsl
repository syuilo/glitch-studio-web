#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_radius;
uniform vec2 u_dir;
out vec4 out_color;

void main() {
	vec4 sum = vec4(0.0);
	
	float hblur = u_radius / u_resolution.x;
	float vblur = u_radius / u_resolution.y;

	float hstep = u_dir.x;
	float vstep = u_dir.y;

	sum += texture(u_texture, vec2(in_uv.x - 4.0 * hblur * hstep, in_uv.y - 4.0 * vblur * vstep)) * 0.0162162162;
	sum += texture(u_texture, vec2(in_uv.x - 3.0 * hblur * hstep, in_uv.y - 3.0 * vblur * vstep)) * 0.0540540541;
	sum += texture(u_texture, vec2(in_uv.x - 2.0 * hblur * hstep, in_uv.y - 2.0 * vblur * vstep)) * 0.1216216216;
	sum += texture(u_texture, vec2(in_uv.x - 1.0 * hblur * hstep, in_uv.y - 1.0 * vblur * vstep)) * 0.1945945946;
	
	sum += texture(u_texture, vec2(in_uv.x, in_uv.y)) * 0.2270270270;
	
	sum += texture(u_texture, vec2(in_uv.x + 1.0 * hblur * hstep, in_uv.y + 1.0 * vblur * vstep)) * 0.1945945946;
	sum += texture(u_texture, vec2(in_uv.x + 2.0 * hblur * hstep, in_uv.y + 2.0 * vblur * vstep)) * 0.1216216216;
	sum += texture(u_texture, vec2(in_uv.x + 3.0 * hblur * hstep, in_uv.y + 3.0 * vblur * vstep)) * 0.0540540541;
	sum += texture(u_texture, vec2(in_uv.x + 4.0 * hblur * hstep, in_uv.y + 4.0 * vblur * vstep)) * 0.0162162162;

	out_color = vec4(sum.rgb, 1.0);
}
