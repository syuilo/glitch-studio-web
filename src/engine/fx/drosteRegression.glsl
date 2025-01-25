#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
out vec4 out_color;
uniform float u_amount;
uniform float u_twist;

#define PI 3.14159265359

vec2 cInv(vec2 c) {
  return vec2(c.x, -c.y) / dot(c, c);
}

vec2 cExp(vec2 c) {
  return exp(c.x) * vec2( cos(c.y), sin(c.y) );
}

vec2 cLog(vec2 c) {
  return vec2( log( length(c) ), atan(c.y, c.x) );
}

vec2 cMul(vec2 a, vec2 b) {
  return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}

vec2 cDiv(vec2 a, vec2 b) {
  return cMul(a, cInv(b));
}

float f(float x,float n){
  return pow(n, -floor(log(x) / log(n)));
}

void main() {
	vec2 z = -1. + in_uv.xy * 2.;
	
	float ratio = 5.264;
	float angle = atan(log(ratio) / (u_twist * PI));
	
	z = cExp(cDiv(cLog(z), cExp(vec2(0, angle)) * cos(angle)));
	
	vec2 a_z = abs(z);
	
	z *= f(max(a_z.x, a_z.y) * 2., ratio);
	vec2 newCoord = z / ratio + .5;
	vec2 originalCoord = in_uv.xy;
	vec2 resultCoord = mix(originalCoord, newCoord, u_amount);
	
	out_color = texture(u_texture, resultCoord);
}
