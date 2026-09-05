#version 300 es
precision highp float;

in vec2 in_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_texture_resolution;
uniform int u_size_mode;
out vec4 out_color;

void main() {
	// stretch
	if (u_size_mode == 0) {
		out_color = texture(u_texture, in_uv);
		//out_color = vec4(1.0);
		return;
	}

	// contain
	if (u_size_mode == 1) {
		float x_ratio = u_texture_resolution.x / u_resolution.x;
		float y_ratio = u_texture_resolution.y / u_resolution.y;
		float aspect_ratio = min(x_ratio, y_ratio) / max(x_ratio, y_ratio);
		float x_scale = x_ratio > y_ratio ? 1.0 : aspect_ratio;
		float y_scale = y_ratio > x_ratio ? 1.0 : aspect_ratio;
		if (
			in_uv.x > 0.5 - (x_scale / 2.0) && in_uv.x < 0.5 + (x_scale / 2.0) &&
			in_uv.y > 0.5 - (y_scale / 2.0) && in_uv.y < 0.5 + (y_scale / 2.0)
		) {
			out_color = texture(u_texture, vec2(
				(in_uv.x - (0.5 - (x_scale / 2.0))) / x_scale,
				(in_uv.y - (0.5 - (y_scale / 2.0))) / y_scale
			));
		} else {
			out_color = vec4(0.0);
		}
		return;
	}

	// cover
	if (u_size_mode == 2) {
		float x_ratio = u_texture_resolution.x / u_resolution.x;
		float y_ratio = u_texture_resolution.y / u_resolution.y;
		float aspect_ratio = max(x_ratio, y_ratio) / min(x_ratio, y_ratio);
		float x_scale = x_ratio > y_ratio ? aspect_ratio : 1.0;
		float y_scale = y_ratio > x_ratio ? aspect_ratio : 1.0;
		if (
			in_uv.x > 0.5 - (x_scale / 2.0) && in_uv.x < 0.5 + (x_scale / 2.0) &&
			in_uv.y > 0.5 - (y_scale / 2.0) && in_uv.y < 0.5 + (y_scale / 2.0)
		) {
			out_color = texture(u_texture, vec2(
				(in_uv.x - (0.5 - (x_scale / 2.0))) / x_scale,
				(in_uv.y - (0.5 - (y_scale / 2.0))) / y_scale
			));
		} else {
			out_color = vec4(0.0);
		}
		return;
	}
}
