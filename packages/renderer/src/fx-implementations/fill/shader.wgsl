struct Uniforms {
	color: vec3f,
};

@group(0) @binding(1) var<uniform> uniforms: Uniforms;

struct FragmentIn {
	@location(0) uv: vec2f,
};

@fragment
fn fs(fragData: FragmentIn) -> @location(0) vec4f {
	let color = uniforms.color;
	return vec4f(color, 1.0);
}
