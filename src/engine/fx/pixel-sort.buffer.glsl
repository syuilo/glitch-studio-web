#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;

uniform float u_threshold;
uniform bool u_vertical;
uniform bool u_reverse;
uniform bool u_shadow;
out vec4 out_color;

float gray(vec3 c) {
	return dot(c, vec3(0.299, 0.587, 0.114));
}

vec3 toRgb(float i) {
	return vec3(
		mod(i, 256.0),
		mod(floor(i / 256.0), 256.0),
		floor(i / 65536.0)
	) / 255.0;
}

bool thr(float v) {
	return u_shadow ? (u_threshold < v) : (v < u_threshold);
}

vec4 draw(vec2 uv) {
	vec2 dirVec = u_vertical ? vec2(0.0, 1.0) : vec2(1.0, 0.0);
	float wid = u_vertical ? u_resolution.y : u_resolution.x;
	float pos = u_vertical ? floor(uv.y * u_resolution.y) : floor(uv.x * u_resolution.x);
	
	float val = gray(texture(u_texture, uv).xyz);
	
	if (!thr(val)) {
		float post = pos;
		float rank = 0.0;
		float head = 0.0;
		float tail = 0.0;
		
		for (int i = 0; i < int(wid); i ++) {
			post -= 1.0;
			if (post == -1.0) { head = post + 1.0; break; }
			vec2 p = dirVec * (post + 0.5) / wid + dirVec.yx * uv;
			float v = gray(texture(u_texture, p).xyz);
			if (thr(v)) { head = post + 1.0; break; }
			if (v <= val) { rank += 1.0; }
		}
		
		post = pos;
		for (int i = 0; i < int(wid); i ++) {
			post += 1.0;
			if (wid == post) { tail = post - 1.0; break; }
			vec2 p = dirVec * (post + 0.5) / wid + dirVec.yx * uv;
			float v = gray(texture(u_texture, p).xyz);
			if (thr(v)) { tail = post - 1.0; break; }
			if (v < val) { rank += 1.0; }
		}
		
		pos = u_reverse ? (tail - rank) : (head + rank);
	}
	
	return vec4(toRgb(pos), 1.0);
}

void main() {
	out_color = draw(in_uv);
}
