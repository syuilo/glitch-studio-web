#version 300 es
precision highp float;

in vec2 in_uv;
uniform float time;
uniform vec2 u_resolution;
out vec4 out_color;

int modi(int x, int y) {
	int r = int(x / y);
	return x - r * y;
}

void main() {
  int t = modi(int(time) / (1000 / 30), 256);
  vec2 p = ( gl_FragCoord.xy / u_resolution.xy );
  int r = int(pow(float(t), 2.0) * sin(p.x * p.x * float(modi(t * 131, 303))));
  int g = int(pow(float(t * 808), 7.0) * cos((-p.x * 1002.0) * (time * 102.3) / float(modi(t * 131, 303))));
  int b = int(pow(float(t), 3.0) * sin((p.y * time * 11.) * float(modi(t * 131, modi(303, 19)))));
  float fr = float(modi(r * r, 256)) / 200.0;
  float fg = float(modi(g * b, 256)) / 200.0;
  float fb = float(modi(b * b, 256)) / 200.0;
  out_color = vec4(pow(cos(-fr * 93.1 - fb) + 0.5, 2.), cos(fg * 53.1) + 0.5, pow(cos(fb * 3.1) + 0.5, 2.), 1.0);
}
