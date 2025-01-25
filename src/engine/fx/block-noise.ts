import { defineGpuFx } from '@/engine/fx-utils';
import seedrandom from 'seedrandom';

export default defineGpuFx({
	name: 'blockNoise',
	displayName: 'Block noise',
	paramDefs: {
		seed: {
			label: 'Seed',
			type: 'seed' as const,
		},
		shiftAmount: {
			label: 'Shift',
			type: 'range' as const,
			min: -100,
			max: 100,
			default: { type: 'literal' as const, value: 10 }
		},
		scale: {
			label: 'Scale',
			type: 'range' as const,
			max: 50000,
			default: { type: 'literal' as const, value: 10000 }
		},
		sizeX: {
			label: 'Size X',
			type: 'range' as const,
			max: 100,
			default: { type: 'literal' as const, value: 30 }
		},
		sizeY: {
			label: 'Size Y',
			type: 'range' as const,
			max: 100,
			default: { type: 'literal' as const, value: 30 }
		},
		channelShift: {
			label: 'Ch shift',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: true }
		},
		channelShiftStrength: {
			label: 'Ch shift Strength',
			type: 'range' as const,
			max: 500,
			default: { type: 'literal' as const, value: 100 }
		},
		mix: {
			label: 'Mix',
			type: 'bool' as const,
			default: { type: 'literal' as const, value: false }
		},
	

	},
	shader: `
		precision highp float;
			
		in vec2 in_uv;
		uniform sampler2D u_texture;
		uniform vec2 u_resolution;
		
		float random(vec2 c){
			return fract(sin(dot(c.xy ,vec2(12.9898,78.233))) * 43758.5453);
		}

		//
		// Description : Array and textureless GLSL 2D/3D/4D simplex
		//               noise functions.
		//      Author : Ian McEwan, Ashima Arts.
		//  Maintainer : ijm
		//     Lastmod : 20110822 (ijm)
		//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
		//               Distributed under the MIT License. See LICENSE file.
		//               https://github.com/ashima/webgl-noise
		//

		vec3 mod289(vec3 x) {
			return x - floor(x * (1.0 / 289.0)) * 289.0;
		}

		vec4 mod289(vec4 x) {
			return x - floor(x * (1.0 / 289.0)) * 289.0;
		}

		vec4 permute(vec4 x) {
				 return mod289(((x*34.0)+1.0)*x);
		}

		vec4 taylorInvSqrt(vec4 r)
		{
			return 1.79284291400159 - 0.85373472095314 * r;
		}

		float snoise3(vec3 v)
			{
			const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
			const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

		// First corner
			vec3 i  = floor(v + dot(v, C.yyy) );
			vec3 x0 =   v - i + dot(i, C.xxx) ;

		// Other corners
			vec3 g = step(x0.yzx, x0.xyz);
			vec3 l = 1.0 - g;
			vec3 i1 = min( g.xyz, l.zxy );
			vec3 i2 = max( g.xyz, l.zxy );

			//   x0 = x0 - 0.0 + 0.0 * C.xxx;
			//   x1 = x0 - i1  + 1.0 * C.xxx;
			//   x2 = x0 - i2  + 2.0 * C.xxx;
			//   x3 = x0 - 1.0 + 3.0 * C.xxx;
			vec3 x1 = x0 - i1 + C.xxx;
			vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
			vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

		// Permutations
			i = mod289(i);
			vec4 p = permute( permute( permute(
								 i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
							 + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
							 + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

		// Gradients: 7x7 points over a square, mapped onto an octahedron.
		// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
			float n_ = 0.142857142857; // 1.0/7.0
			vec3  ns = n_ * D.wyz - D.xzx;

			vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

			vec4 x_ = floor(j * ns.z);
			vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

			vec4 x = x_ *ns.x + ns.yyyy;
			vec4 y = y_ *ns.x + ns.yyyy;
			vec4 h = 1.0 - abs(x) - abs(y);

			vec4 b0 = vec4( x.xy, y.xy );
			vec4 b1 = vec4( x.zw, y.zw );

			//vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
			//vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
			vec4 s0 = floor(b0)*2.0 + 1.0;
			vec4 s1 = floor(b1)*2.0 + 1.0;
			vec4 sh = -step(h, vec4(0.0));

			vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
			vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

			vec3 p0 = vec3(a0.xy,h.x);
			vec3 p1 = vec3(a0.zw,h.y);
			vec3 p2 = vec3(a1.xy,h.z);
			vec3 p3 = vec3(a1.zw,h.w);

		//Normalise gradients
			vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
			p0 *= norm.x;
			p1 *= norm.y;
			p2 *= norm.z;
			p3 *= norm.w;

		// Mix final noise value
			vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
			m = m * m;
			return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
																		dot(p2,x2), dot(p3,x3) ) );
			}

		uniform float seed;
		uniform float shiftAmount;
		uniform float channelShiftStrength;
		uniform float scale;
		uniform float sizeX;
		uniform float sizeY;
		uniform bool channelShift;
		uniform bool mix;

		void main() {
			vec4 sample = texture(u_texture, in_uv);

			float rgbDiff = 0.0;
			if (channelShift) {
				rgbDiff = (6.0 + sin(seed * 500.0 + in_uv.y * 40.0) * (20.0 * channelShiftStrength + 1.0)) / u_resolution.x;
			}

			float noiseX = step((snoise3(vec3(0.0, (in_uv.x - 0.5) * scale, seed)) + 1.0) / 2.0, sizeX);
			float noiseY = step((snoise3(vec3(0.0, (in_uv.y - 0.5) * scale, seed)) + 1.0) / 2.0, sizeY);
			float bnMask = noiseX * noiseY;
			float bnUvX = in_uv.x + shiftAmount;
			float bnR = texture(u_texture, vec2(bnUvX + rgbDiff, in_uv.y)).r * bnMask;
			float bnG = texture(u_texture, vec2(bnUvX, in_uv.y)).g * bnMask;
			float bnB = texture(u_texture, vec2(bnUvX - rgbDiff, in_uv.y)).b * bnMask;
			vec4 blockNoise = vec4(bnR, bnG, bnB, 1.0);

			if (mix) {
				out_color = max(sample, blockNoise);
			} else {
				if (blockNoise == vec4(0.0, 0.0, 0.0, 1.0)) {
					out_color = sample;
				} else {
					out_color = blockNoise;
				}
			}
		}
	`,
	setup: ({gl, params, shaderProgram }) => {
		const seed = gl.getUniformLocation(shaderProgram, 'seed');
		gl.uniform1f(seed, params.seed);
		const shiftAmount = gl.getUniformLocation(shaderProgram, 'shiftAmount');
		gl.uniform1f(shiftAmount, params.shiftAmount / 100);
		const channelShiftStrength = gl.getUniformLocation(shaderProgram, 'channelShiftStrength');
		gl.uniform1f(channelShiftStrength, params.channelShiftStrength / 100);
		const sizeX = gl.getUniformLocation(shaderProgram, 'sizeX');
		gl.uniform1f(sizeX, params.sizeX / 100);
		const sizeY = gl.getUniformLocation(shaderProgram, 'sizeY');
		gl.uniform1f(sizeY, params.sizeY / 100);
		const scale = gl.getUniformLocation(shaderProgram, 'scale');
		gl.uniform1f(scale, Math.pow(params.scale / 2000, 2));
		const channelShift = gl.getUniformLocation(shaderProgram, 'channelShift');
		gl.uniform1f(channelShift, params.channelShift);
		const mix = gl.getUniformLocation(shaderProgram, 'mix');
		gl.uniform1f(mix, params.mix);
	},
});
