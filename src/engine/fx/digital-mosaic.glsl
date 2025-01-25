#version 300 es
precision highp float;

float getLuminance(vec4 color) {
	return (color.r * 0.299) + (color.g * 0.587) + (color.b * 0.114);
}

in vec2 in_uv;
uniform sampler2D u_texture;
uniform sampler2D u_scale_map;
uniform vec2 u_resolution;
uniform float u_divisions;
uniform float u_min;
uniform float u_max;
out vec4 out_color;

void main() {
	float cellSize = 1.0 / u_divisions;

	float modX = mod(in_uv.x - 0.5, cellSize);
	float modY = mod(in_uv.y - 0.5, cellSize);

	//float scale = texture(u_scale_map, vec2(
	//	cellSize * floor(in_uv.x / cellSize),
	//	cellSize * floor(in_uv.y / cellSize)
	//)).a;
	float scale = 1.0;

	if (
		(modX / cellSize) > (1.0 - scale) / 2.0 &&
		(modX / cellSize) < 0.5 + (scale / 2.0) &&
		(modY / cellSize) > (1.0 - scale) / 2.0 &&
		(modY / cellSize) < 0.5 + (scale / 2.0)
	) {
		float margin = (1.0 - (0.5 + (scale / 2.0))) * cellSize;
		vec2 transformedCoords = vec2(
			(modX - margin) / (cellSize - (margin * 2.0)),
			(modY - margin) / (cellSize - (margin * 2.0))
		);
		vec4 var_sample = texture(u_texture, vec2(
			cellSize * floor(in_uv.x / cellSize),
			cellSize * floor(in_uv.y / cellSize)
		));
		float l = getLuminance(var_sample);
		float size = 1.0 / 4.0;
		if (l > ((1.0 - u_min) * 0.7)) {
			out_color = (mod((modX / cellSize), size) > size / 2.0) || (mod((modY / cellSize), size) > size / 2.0) ? vec4(vec3(1.0), 1.0) : vec4(vec3(0.0), 0.0);
		} else if (l > ((1.0 - u_min) * 0.5)) {
			out_color = (mod((modX / cellSize), size) > size / 2.0) ? vec4(vec3(1.0), 1.0) : vec4(vec3(0.0), 0.0);
		} else if (l > ((1.0 - u_min) * 0.2)) {
			out_color = (mod((modX / cellSize), size) > size / 2.0) && !(mod((modY / cellSize), size) > size / 2.0) ? vec4(vec3(1.0), 1.0) : vec4(vec3(0.0), 0.0);
		} else {
			out_color = vec4(vec3(0.0), 0.0);
		}
	} else {
		out_color = vec4(vec3(0.0), 0.0);
	}
}
