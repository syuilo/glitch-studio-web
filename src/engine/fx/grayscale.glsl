#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
out vec4 out_color;
uniform bool u_luminance;

float getLuminance(vec4 color) {
	return (color.r * 0.299) + (color.g * 0.587) + (color.b * 0.114);
}

float getBrightness(vec4 color) {
	return (color.r + color.g + color.b) / 3.0;
}

void main() {
	vec4 pixel = texture(u_texture, in_uv);
	out_color = u_luminance ? vec4(vec3(getLuminance(pixel)), 1.0) : vec4(vec3(getBrightness(pixel)), 1.0);
}
