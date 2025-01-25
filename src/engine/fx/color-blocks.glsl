#version 300 es
precision highp float;

float random(vec2 c){
	return fract(sin(dot(c.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

in vec2 in_uv;
uniform vec2 u_resolution;
out vec4 out_color;
uniform float seed;
uniform float amount;
uniform float alphaRandomness;
uniform vec2 u_size;
uniform vec3 colors[16];
uniform int colorsCount;

void main() {
	float x = (1.0 - u_size.x) * round((in_uv.x - 0.5) / (1.0 - u_size.x));
	float y = (1.0 - u_size.y) * round((in_uv.y - 0.5) / (1.0 - u_size.y));
	vec3 c = colors[int(floor(random(vec2(x + seed + 1.0, y + seed + 1.0)) * float(colorsCount)))];
	float a = random(vec2(x + seed + 0.1, y + seed + 0.1));
	out_color = random(vec2(x + seed, y + seed)) < amount ? vec4(c, 1.0 - (a * alphaRandomness)) : vec4(0.0);
}
