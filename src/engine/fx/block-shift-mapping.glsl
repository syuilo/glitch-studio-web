#version 300 es
precision highp float;

float random(vec2 c){
	return fract(sin(dot(c.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

in vec2 in_uv;
uniform sampler2D u_texture;
uniform sampler2D u_shift_map;
uniform vec2 u_resolution;
out vec4 out_color;
uniform float seed;
uniform float shiftX;
uniform float shiftY;
uniform vec2 u_size;

void main() {
	vec4 pixel = texture(u_texture, in_uv);
	float x = (1.0 - u_size.x) * round((in_uv.x - 0.5) / (1.0 - u_size.x));
	float y = (1.0 - u_size.y) * round((in_uv.y - 0.5) / (1.0 - u_size.y));
	vec4 shiftMapPixel = texture(u_shift_map, vec2(
		((1.0 - u_size.x)) * floor((in_uv.x - 0.5) / ((1.0 - u_size.x))),
		((1.0 - u_size.y)) * floor((in_uv.y - 0.5) / ((1.0 - u_size.y)))
	) + vec2(0.5, 0.5));
	float shiftMapPixelValue = (shiftMapPixel.r + shiftMapPixel.g + shiftMapPixel.b) / 3.0;
	float shiftAmountX = (1.0 - (random(vec2(x + seed + 1.0, y + seed + 1.0)) * 2.0)) * shiftMapPixelValue * shiftX;
	float shiftAmountY = (1.0 - (random(vec2(x + seed + 2.0, y + seed + 2.0)) * 2.0)) * shiftMapPixelValue * shiftY;
	vec4 effected = texture(u_texture, vec2(in_uv.x + shiftAmountX, in_uv.y + shiftAmountY));
	out_color = effected;
}
