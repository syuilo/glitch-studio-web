#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_radius;
uniform bool u_h;
uniform bool u_v;
out vec4 out_color;

float pi = 3.141592653589793;

void main() {
	float v;
	float h_step = 1.0 / u_resolution.x;
	float v_step = 1.0 / u_resolution.y; 
	int steps = int(u_radius);
	
	float t = 1.0 / float(steps * 2 + 1);
	vec4 sum = texture(u_texture, in_uv) * t;

	if (u_h && u_v) {
		int i;
		for (i = 1; i <= steps; i++) {
			v = (cos(float(i / (steps + 1)) * pi) + 1.0) * 0.25;
			sum += texture(u_texture, vec2(in_uv.x + float(i) * h_step, in_uv.y + float(i) * v_step)) * v * t;
			sum += texture(u_texture, vec2(in_uv.x - float(i) * h_step, in_uv.y - float(i) * v_step)) * v * t;
			sum += texture(u_texture, vec2(in_uv.x - float(i) * h_step, in_uv.y + float(i) * v_step)) * v * t;
			sum += texture(u_texture, vec2(in_uv.x + float(i) * h_step, in_uv.y - float(i) * v_step)) * v * t;
		}
	} else if (u_h) {
		int i;
		for (i = 1; i <= steps; i++) {
			v = (cos(float(i / (steps + 1)) * pi) + 1.0) * 0.5;
			sum += texture(u_texture, vec2(in_uv.x + float(i) * h_step, in_uv.y)) * v * t;
			sum += texture(u_texture, vec2(in_uv.x - float(i) * h_step, in_uv.y)) * v * t;
		}
	} else if (u_v) {
		int i;
		for (i = 1; i <= steps; i++) {
			v = (cos(float(i / (steps + 1)) * pi) + 1.0) * 0.5;
			sum += texture(u_texture, vec2(in_uv.x, in_uv.y + float(i) * v_step)) * v * t;
			sum += texture(u_texture, vec2(in_uv.x, in_uv.y - float(i) * v_step)) * v * t;
		}
	}

	out_color = vec4(sum.rgb, 1.0);
}
