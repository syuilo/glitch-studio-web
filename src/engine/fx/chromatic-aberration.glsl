#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
out vec4 out_color;
uniform int u_samples;
uniform float u_amount;
uniform float u_r_strength;
uniform float u_g_strength;
uniform float u_b_strength;
uniform float u_start;
uniform bool u_normalize;
uniform vec2 u_vector;

void main() {
	vec2 size = vec2(u_resolution.x, u_resolution.y);

	vec4 accumulator = vec4(0.0);
	float normalisedValue = length((in_uv - 0.5) * 2.0);
	float strength = clamp((normalisedValue - u_start) * (1.0 / (1.0 - u_start)), 0.0, 1.0); 

	//vec2 vector = normalize((in_uv - (size / 2.0)) / size);
	//vec2 vector = in_uv;
	vec2 vector = (u_normalize ? normalize(in_uv - vec2(0.5)) : in_uv - vec2(0.5)) + u_vector;
	vec2 velocity = vector * strength * u_amount;

	//vec2 rOffset = -vector * strength * (u_amount * 1.0);
	//vec2 gOffset = -vector * strength * (u_amount * 1.5);
	//vec2 bOffset = -vector * strength * (u_amount * 2.0);

	//vec2 rOffset = -vector * strength * (u_amount * 0.5);
	//vec2 gOffset = -vector * strength * (u_amount * 1.0);
	//vec2 bOffset = -vector * strength * (u_amount * 2.0);

	vec2 rOffset = -vector * strength * (u_amount * u_r_strength);
	vec2 gOffset = -vector * strength * (u_amount * u_g_strength);
	vec2 bOffset = -vector * strength * (u_amount * u_b_strength);

	for (int i=0; i < u_samples; i++) {
		accumulator.r += texture(u_texture, in_uv + rOffset).r;
		rOffset -= velocity / float(u_samples);

		accumulator.g += texture(u_texture, in_uv + gOffset).g;
		gOffset -= velocity / float(u_samples);

		accumulator.b += texture(u_texture, in_uv + bOffset).b;
		bOffset -= velocity / float(u_samples);
	}

	out_color = vec4(vec3(accumulator / float(u_samples)), 1.0);
}
