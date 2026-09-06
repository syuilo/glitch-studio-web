const WAVEFORM_WIDTH = 512u;
const LEVEL_COUNT = 256u;

struct Waveform {
	values: array<u32, 393216>,
};

struct VertexOut {
	@builtin(position) position: vec4f,
};

@group(0) @binding(0) var<storage, read> waveform: Waveform;

const quad = array(
	vec2f(-1.0, -1.0),
	vec2f(1.0, -1.0),
	vec2f(-1.0, 1.0),
	vec2f(-1.0, 1.0),
	vec2f(1.0, -1.0),
	vec2f(1.0, 1.0),
);

fn index(channel: u32, level: u32, column: u32) -> u32 {
	return ((channel * LEVEL_COUNT + level) * WAVEFORM_WIDTH) + column;
}

fn density(value: u32) -> f32 {
	return 1.0 - exp(-f32(value) * 0.22);
}

@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32) -> VertexOut {
	var output: VertexOut;
	output.position = vec4f(quad[vertexIndex], 0.0, 1.0);
	return output;
}

@fragment
fn fs(@builtin(position) position: vec4f) -> @location(0) vec4f {
	let column = min(u32(position.x), WAVEFORM_WIDTH - 1u);
	let level = (LEVEL_COUNT - 1u) - min(u32(position.y), LEVEL_COUNT - 1u);
	let signal = vec3f(
		density(waveform.values[index(0u, level, column)]),
		density(waveform.values[index(1u, level, column)]),
		density(waveform.values[index(2u, level, column)]),
	);
	let onGrid = (column % 128u == 0u) || (level % 64u == 0u);
	let grid = select(0.0, 0.055, onGrid);
	let color = min(vec3f(0.012 + grid) + signal, vec3f(1.0));
	return vec4f(color, 1.0);
}
