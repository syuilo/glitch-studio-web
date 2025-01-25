#version 300 es
precision highp float;

float blendNormal(float base, float blend) {
	return blend;
}
vec3 blendNormal(vec3 base, vec3 blend) {
	return blend;
}

float blendAdd(float base, float blend) {
	return min(base + blend, 1.0);
}
vec3 blendAdd(vec3 base, vec3 blend) {
	return min(base + blend, vec3(1.0));
}

float blendSubtract(float base, float blend) {
	return max(base + blend - 1.0, 0.0);
}
vec3 blendSubtract(vec3 base, vec3 blend) {
	return max(base + blend - vec3(1.0), vec3(0.0));
}

float blendMultiply(float base, float blend) {
	return base * blend;
}
vec3 blendMultiply(vec3 base, vec3 blend) {
	return base * blend;
}

float blendDarken(float base, float blend) {
	return min(blend, base);
}
vec3 blendDarken(vec3 base, vec3 blend) {
	return vec3(blendDarken(base.r, blend.r), blendDarken(base.g, blend.g), blendDarken(base.b, blend.b));
}

float blendLighten(float base, float blend) {
	return max(blend, base);
}
vec3 blendLighten(vec3 base, vec3 blend) {
	return vec3(blendLighten(base.r, blend.r), blendLighten(base.g, blend.g), blendLighten(base.b, blend.b));
}

float blendScreen(float base, float blend) {
	return 1.0 - ((1.0 - base) * (1.0 - blend));
}
vec3 blendScreen(vec3 base, vec3 blend) {
	return vec3(blendScreen(base.r, blend.r), blendScreen(base.g, blend.g), blendScreen(base.b, blend.b));
}

float blendOverlay(float base, float blend) {
	return base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend));
}
vec3 blendOverlay(vec3 base, vec3 blend) {
	return vec3(blendOverlay(base.r, blend.r), blendOverlay(base.g, blend.g), blendOverlay(base.b, blend.b));
}

float doBlend(int mode, float base, float blend) {
	return mode == 0 ? blendNormal(base, blend) :
		mode == 1 ? blendAdd(base, blend) :
		mode == 2 ? blendSubtract(base, blend) :
		mode == 3 ? blendMultiply(base, blend) :
		mode == 6 ? blendDarken(base, blend) :
		mode == 7 ? blendLighten(base, blend) :
		mode == 8 ? blendScreen(base, blend) :
		mode == 9 ? blendOverlay(base, blend) :
		blendNormal(base, blend);
}

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
out vec4 out_color;
uniform float amount;
uniform bool leftR;
uniform bool rightR;
uniform bool leftG;
uniform bool rightG;
uniform bool leftB;
uniform bool rightB;
uniform int u_blend_mode;

void main() {
	vec4 inPix = texture(u_texture, in_uv);
	vec3 intensity = 1.0 - inPix.rgb;

	float vidSample = dot(vec3(1.0), inPix.rgb);
	float vidSampleDx = dot(vec3(1.0), texture(u_texture, in_uv + vec2(amount, 0.0)).rgb);
	float vidSampleDy = dot(vec3(1.0), texture(u_texture, in_uv + vec2(0.0, amount)).rgb);

	vec2 flow = amount * vec2(vidSampleDy - vidSample, vidSample);
	intensity = 0.05 * intensity + 0.95 * (1.0 - texture(u_texture, in_uv + vec2(-amount, amount) * flow).rgb);

	out_color = vec4(1.0 - intensity, 1.0);
}
