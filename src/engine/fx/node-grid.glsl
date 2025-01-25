#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture_0;
uniform sampler2D u_texture_1;
uniform sampler2D u_texture_2;
uniform sampler2D u_texture_3;
uniform sampler2D u_texture_4;
uniform sampler2D u_scale_map;
uniform sampler2D u_opacity_map;
uniform sampler2D u_select_map;
uniform vec2 u_resolution;
uniform float u_divisions;
uniform int u_inputs_count;
out vec4 out_color;

void main() {
	float aspect_ratio = min(u_resolution.x, u_resolution.y) / max(u_resolution.x, u_resolution.y);
	vec2 cellSize = u_resolution.x > u_resolution.y ? vec2((1.0 / u_divisions) * aspect_ratio, 1.0 / u_divisions) : vec2(1.0 / u_divisions, (1.0 / u_divisions) * aspect_ratio);

	float modX = mod(in_uv.x - 0.5, cellSize.x);
	float modY = mod(in_uv.y - 0.5, cellSize.y);

	vec4 scalePixel = texture(u_scale_map, vec2(
		cellSize.x * floor((in_uv.x - 0.5) / cellSize.x),
		cellSize.y * floor((in_uv.y - 0.5) / cellSize.y)
	) + vec2(cellSize.x / 2.0, cellSize.y / 2.0) + vec2(0.5, 0.5));
	float scale = (scalePixel.r + scalePixel.g + scalePixel.b) / 3.0;
	//float scale = texture(u_scale_map, in_uv).a;

	vec4 opacityPixel = texture(u_opacity_map, vec2(
		cellSize.x * floor((in_uv.x - 0.5) / cellSize.x),
		cellSize.y * floor((in_uv.y - 0.5) / cellSize.y)
	) + vec2(cellSize.x / 2.0, cellSize.y / 2.0) + vec2(0.5, 0.5));
	float opacity = (opacityPixel.r + opacityPixel.g + opacityPixel.b) / 3.0;

	vec4 texSelectorPixel = texture(u_select_map, vec2(
		cellSize.x * floor((in_uv.x - 0.5) / cellSize.x),
		cellSize.y * floor((in_uv.y - 0.5) / cellSize.y)
	) + vec2(cellSize.x / 2.0, cellSize.y / 2.0) + vec2(0.5, 0.5));
	float texSelector = (texSelectorPixel.r + texSelectorPixel.g + texSelectorPixel.b) / 3.0;

	if (
		(modX / cellSize.x) > (1.0 - scale) / 2.0 &&
		(modX / cellSize.x) < 0.5 + (scale / 2.0) &&
		(modY / cellSize.y) > (1.0 - scale) / 2.0 &&
		(modY / cellSize.y) < 0.5 + (scale / 2.0)
	) {
		vec2 margin = vec2((1.0 - (0.5 + (scale / 2.0))) * cellSize.x, (1.0 - (0.5 + (scale / 2.0))) * cellSize.y);
		vec2 transformedCoords = vec2(
			(modX - margin.x) / (cellSize.x - (margin.x * 2.0)),
			(modY - margin.y) / (cellSize.y - (margin.y * 2.0))
		);
		for (int i = 0; i < u_inputs_count; i++) {
			if (texSelector <= (1.0 / float(u_inputs_count)) * float(i + 1)) {
				out_color =
					i == 1 ? texture(u_texture_1, transformedCoords) :
					i == 2 ? texture(u_texture_2, transformedCoords) :
					i == 3 ? texture(u_texture_3, transformedCoords) :
					i == 4 ? texture(u_texture_4, transformedCoords) :
					texture(u_texture_0, transformedCoords);
				out_color.a *= opacity;
				break;
			}
		}
	} else {
		out_color = vec4(vec3(0.0), 0.0);
	}
}
