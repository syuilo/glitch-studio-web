#version 300 es
precision highp float;

in vec2 in_uv;
out vec4 out_color;

void main() {
	out_color = vec4(vec3(in_uv.x), 1.0);
}
