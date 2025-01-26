#version 300 es
precision highp float;

const float PI = 3.141592653589793;
const float TWO_PI = 6.283185307179586;
const float HALF_PI = 1.5707963267948966;

in vec2 in_uv;
uniform float u_frequency;
uniform float u_angle;
uniform float u_phase;
out vec4 out_color;

void main() {
	float angle = u_angle * PI;
	mat2 rotationMatrix = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
	vec2 rotatedUV = rotationMatrix * (in_uv - 0.5);
	float phase = u_phase * TWO_PI;
	float value = sin((rotatedUV.x * u_frequency - HALF_PI) + phase);
	out_color = vec4(vec3((1.0 + value) / 2.0), 1.0);
}
