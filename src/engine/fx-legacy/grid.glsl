#version 300 es
precision highp float;

in vec2 in_uv;
uniform vec2 u_resolution;
uniform vec3 u_color;
uniform float u_major_divisions;
uniform float u_major_thickness;
uniform float u_major_opacity;
uniform float u_minor_divisions;
uniform float u_minor_thickness;
uniform float u_minor_opacity;
out vec4 out_color;

void main() {
	float major_modX = mod(in_uv.x - 0.5, (1.0 / u_major_divisions));
	float major_modY = mod(in_uv.y - 0.5, (1.0 / u_major_divisions));
	float major_threshold = ((u_major_thickness / 2.0) / u_major_divisions);
	if (
		(major_modX > (1.0 / u_major_divisions) - major_threshold || major_modX < major_threshold) ||
		(major_modY > (1.0 / u_major_divisions) - major_threshold || major_modY < major_threshold)
	) {
		out_color = vec4(vec3(u_color), u_major_opacity);
		return;
	}

	float minor_modX = mod(in_uv.x - 0.5, (1.0 / u_major_divisions / u_minor_divisions));
	float minor_modY = mod(in_uv.y - 0.5, (1.0 / u_major_divisions / u_minor_divisions));
	float minor_threshold = ((u_minor_thickness / 2.0) / (u_minor_divisions * u_major_divisions));
	if (
		(minor_modX > (1.0 / u_major_divisions / u_minor_divisions) - minor_threshold || minor_modX < minor_threshold) ||
		(minor_modY > (1.0 / u_major_divisions / u_minor_divisions) - minor_threshold || minor_modY < minor_threshold)
	) {
		out_color = vec4(vec3(u_color), u_minor_opacity);
		return;
	}

	out_color = vec4(0.0);
}
