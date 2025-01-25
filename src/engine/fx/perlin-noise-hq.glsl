#version 300 es
precision highp float;

const int   oct  = 8;
const float per  = 0.5;
const float PI   = 3.1415926;
const float cCorners = 1.0 / 16.0;
const float cSides   = 1.0 / 8.0;
const float cCenter  = 1.0 / 4.0;

float interpolate(float a, float b, float x){
	float f = (1.0 - cos(x * PI)) * 0.5;
	return a * (1.0 - f) + b * f;
}

float rnd(vec2 p){
	return fract(sin(dot(p ,vec2(12.9898,78.233))) * 43758.5453);
}

float irnd(vec2 p){
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec4 v = vec4(rnd(vec2(i.x,       i.y      )),
								rnd(vec2(i.x + 1.0, i.y      )),
								rnd(vec2(i.x,       i.y + 1.0)),
								rnd(vec2(i.x + 1.0, i.y + 1.0)));
	return interpolate(interpolate(v.x, v.y, f.x), interpolate(v.z, v.w, f.x), f.y);
}

float noise(vec2 p){
	float t = 0.0;
	for(int i = 0; i < oct; i++){
		float freq = pow(2.0, float(i));
		float amp  = pow(per, float(oct - i));
		t += irnd(vec2(p.x / freq, p.y / freq)) * amp;
	}
	return t;
}

in vec2 in_uv;
out vec4 out_color;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_seed;
uniform float u_scaleX;
uniform float u_scaleY;

void main() {
	vec4 pixel = texture(u_texture, in_uv);
	float noiseX = (in_uv.x + u_seed) * u_scaleX;
	float noiseY = (in_uv.y + u_seed) * u_scaleY;
	out_color = vec4(noise(vec2(noiseX, noiseY)));
}
