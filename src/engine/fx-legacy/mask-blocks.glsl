#version 300 es
precision highp float;

float random(vec2 c){
	return fract(sin(dot(c.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
out vec4 out_color;
uniform float seed;
uniform float amount;
uniform float alphaRandomness;
uniform float sizeX;
uniform float sizeY;

void main() {
	vec4 pixel = texture(u_texture, in_uv);
	float x = (1.0 - sizeX) * round((in_uv.x - 0.5) / (1.0 - sizeX));
	float y = (1.0 - sizeY) * round((in_uv.y - 0.5) / (1.0 - sizeY));
	float a = random(vec2(x + seed, y + seed)) < amount ? mix(1.0, pixel.a, random(vec2(x + seed + 1.0, y + seed + 1.0)) * alphaRandomness) : pixel.a;
	out_color = vec4(vec3(0.0), a);
}
