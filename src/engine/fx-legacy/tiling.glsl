#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_divisions;
out vec4 out_color;

void main() {
	float major_modX = mod(in_uv.x - 0.5, (1.0 / u_divisions));
	float major_modY = mod(in_uv.y - 0.5, (1.0 / u_divisions));
	float major_threshold = (0.5 / u_divisions);
	if (major_modX < major_threshold && major_modY < major_threshold) {
		vec2 transformedCoords = vec2(0.5 + (major_modX / (1.0 / u_divisions)), 0.5 + (major_modY / (1.0 / u_divisions)));
		out_color = texture(u_texture, transformedCoords);
	} else if ((1.0 / u_divisions) - major_modX < major_threshold && major_modY < major_threshold) {
		vec2 transformedCoords = vec2(-0.5 + (major_modX / (1.0 / u_divisions)), 0.5 + (major_modY / (1.0 / u_divisions)));
		out_color = texture(u_texture, transformedCoords);
	} else if (major_modX < major_threshold && (1.0 / u_divisions) - major_modY < major_threshold) {
		vec2 transformedCoords = vec2(0.5 + (major_modX / (1.0 / u_divisions)), -0.5 + (major_modY / (1.0 / u_divisions)));
		out_color = texture(u_texture, transformedCoords);
	} else if ((1.0 / u_divisions) - major_modX < major_threshold && (1.0 / u_divisions) - major_modY < major_threshold) {
		vec2 transformedCoords = vec2(-0.5 + (major_modX / (1.0 / u_divisions)), -0.5 + (major_modY / (1.0 / u_divisions)));
		out_color = texture(u_texture, transformedCoords);
	}
}
