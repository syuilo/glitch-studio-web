#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_major_divisions;
uniform float u_major_radius;
uniform float u_major_opacity;
uniform float u_minor_divisions;
uniform float u_minor_radius;
uniform float u_minor_opacity;
out vec4 out_color;

void main() {
	vec4 pixel = texture(u_texture, in_uv);

	float major_modX = mod(in_uv.x - 0.5, (1.0 / u_major_divisions));
	float major_modY = mod(in_uv.y - 0.5, (1.0 / u_major_divisions));
	float major_threshold = ((u_major_radius / 2.0) / u_major_divisions);
	float pos = 0.5;
	if (major_modX < major_threshold && major_modY < major_threshold) {
		vec2 transformedCoords = vec2(pos + ((major_modX / (1.0 / u_major_divisions)) / u_major_radius), pos + ((major_modY / (1.0 / u_major_divisions)) / u_major_radius));
		out_color = texture(u_texture, transformedCoords);
	} else if ((1.0 / u_major_divisions) - major_modX < major_threshold && major_modY < major_threshold) {
		vec2 transformedCoords = vec2(-((1.0 - u_major_radius) / u_major_radius) + -pos + ((major_modX / (1.0 / u_major_divisions)) / u_major_radius), pos + ((major_modY / (1.0 / u_major_divisions)) / u_major_radius));
		out_color = texture(u_texture, transformedCoords);
	} else if (major_modX < major_threshold && (1.0 / u_major_divisions) - major_modY < major_threshold) {
		vec2 transformedCoords = vec2(pos + ((major_modX / (1.0 / u_major_divisions)) / u_major_radius), -((1.0 - u_major_radius) / u_major_radius) + -pos + ((major_modY / (1.0 / u_major_divisions)) / u_major_radius));
		out_color = texture(u_texture, transformedCoords);
	} else if ((1.0 / u_major_divisions) - major_modX < major_threshold && (1.0 / u_major_divisions) - major_modY < major_threshold) {
		vec2 transformedCoords = vec2(-((1.0 - u_major_radius) / u_major_radius) + -pos + ((major_modX / (1.0 / u_major_divisions)) / u_major_radius), -((1.0 - u_major_radius) / u_major_radius) + -pos + ((major_modY / (1.0 / u_major_divisions)) / u_major_radius));
		out_color = texture(u_texture, transformedCoords);
	} else {
		out_color = vec4(vec3(0.0), 0.0);
	}

	//float minor_modX = mod(in_uv.x - 0.5, (1.0 / u_major_divisions / u_minor_divisions));
	//float minor_modY = mod(in_uv.y - 0.5, (1.0 / u_major_divisions / u_minor_divisions));
	//float minor_threshold = ((u_minor_radius / 2.0) / (u_minor_divisions * u_major_divisions));
	//float minor_point_a_length = length(vec2(minor_modX, minor_modY));
	//float minor_point_b_length = length(vec2((1.0 / u_major_divisions / u_minor_divisions) - minor_modX, minor_modY));
	//float minor_point_c_length = length(vec2(minor_modX, (1.0 / u_major_divisions / u_minor_divisions) - minor_modY));
	//float minor_point_d_length = length(vec2((1.0 / u_major_divisions / u_minor_divisions) - minor_modX, (1.0 / u_major_divisions / u_minor_divisions) - minor_modY));
	//if (minor_point_a_length < minor_threshold || minor_point_b_length < minor_threshold || minor_point_c_length < minor_threshold || minor_point_d_length < minor_threshold) {
	//	out_color = mix(pixel, vec4(vec3(u_color), 1.0), u_minor_opacity);
	//	return;
	//}

	//out_color = pixel;
}
