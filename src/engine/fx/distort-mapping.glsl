#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform sampler2D u_x_map;
uniform sampler2D u_y_map;
uniform vec2 u_resolution;
out vec4 out_color;
uniform float volatility;

void main() {
  vec4 xRef = texture(u_x_map, in_uv);
	float xV = ((xRef.r + xRef.g + xRef.b) / 3.0) - 0.5;
  vec4 yRef = texture(u_y_map, in_uv);
  float yV = ((yRef.r + yRef.g + yRef.b) / 3.0) - 0.5;
	vec2 uv = vec2(in_uv.x + (xV * volatility), in_uv.y + (yV * volatility));
	out_color = texture(u_texture, uv);
}
