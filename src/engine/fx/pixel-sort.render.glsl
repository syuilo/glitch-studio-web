#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform sampler2D u_textureBuffer;
uniform vec2 u_resolution;

uniform float u_threshold;
uniform bool u_vertical;
out vec4 out_color;

float fromRgb(vec3 v) {
	return ((v.z * 256.0 + v.y) * 256.0 + v.x) * 255.0;
}

vec4 draw(vec2 uv) {
	//return texture(u_textureBuffer, uv);
	
	vec2 dirVec = u_vertical ? vec2(0.0, 1.0) : vec2(1.0, 0.0);
	float wid = u_vertical ? u_resolution.y : u_resolution.x;
	float pos = u_vertical ? floor(uv.y * u_resolution.y) : floor(uv.x * u_resolution.x);
	
	for (int i = 0; i < int(wid); i ++) {
		vec2 p = uv + dirVec * float(i) / wid;
		if (p.x < 1.0 && p.y < 1.0) {
			float v = fromRgb(texture(u_textureBuffer, p).xyz);
			if (abs(v - pos) < 0.5) {
				return texture(u_texture, p);
				break;
			}
		}
		
		p = uv - dirVec * float(i) / wid;
		if (0.0 < p.x && 0.0 < p.y) {
			float v = fromRgb(texture(u_textureBuffer, p).xyz);
			if (abs(v - pos) < 0.5) {
				return texture(u_texture, p);
				break;
			}
		}
	}
	
	return texture(u_textureBuffer, in_uv);
}

void main() {
	out_color = draw(in_uv);
}
