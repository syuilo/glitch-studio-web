#version 300 es
precision highp float;

const float PI = 3.141592653589793;

in vec2 in_uv;
uniform vec2 u_resolution;
uniform vec2 u_size;
uniform float u_time;
uniform float u_space;
uniform float u_density;
uniform float u_seed1;
uniform float u_seed2;
uniform float u_seed3;
out vec4 out_color;

float ranf(float x) {
	return fract(sin(x) * 1e4);
}

float rant(vec2 st) {
	return fract(sin(dot(st.xy, vec2(u_seed1, u_seed2))) * u_seed3);
}

float pattern(vec2 st, vec2 v, float t) {
	vec2 p = floor(st + v);
	return step(t, rant(100.0 + p * 0.000001) + ranf(p.x) * 0.5);
}

void main() {
	vec2 st = gl_FragCoord.xy / u_resolution.xy;
	st.x *= u_resolution.x/u_resolution.y;
	st /= u_size;
	
	vec2 ipos = floor(st);
	vec2 fpos = fract(st);
	vec2 vel = vec2(u_time * max(u_size.x, u_size.y)); 
	vel *= vec2(-1.0, 0.0) * ranf(1.0 + ipos.y); 
	vec3 color = vec3(pattern(st, vel, 0.5 + u_density));
	color *= step(u_space, fpos.y);
	
	out_color = vec4(color, 1.0);
}
