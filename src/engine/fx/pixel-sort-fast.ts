import { basicParamDefs, defineGpuFx } from '@/engine/fx-utils';

export default defineGpuFx({
	name: 'pixelSortFast',
	displayName: 'Pixel sort (fast)',
	category: 'glitch',
	paramDefs: {
		thresholdLow: {
			label: 'Threshold l',
			type: 'range' as const,
			min: 0,
			max: 256,
			default: { type: 'literal' as const, value: 128 }
		},
		thresholdHigh: {
			label: 'Threshold h',
			type: 'range' as const,
			min: 0,
			max: 256,
			default: { type: 'literal' as const, value: 256 }
		},
		direction: {
			label: 'Direction',
			type: 'enum' as const,
			options: [{
				label: 'V',
				value: 'v',
			}, {
				label: 'H',
				value: 'h',
			}],
			default: { type: 'literal' as const, value: 'h' }
		},
		sort: {
			label: 'Sort',
			type: 'enum' as const,
			options: [{
				label: 'A > B',
				value: 'ab',
			}, {
				label: 'B > A',
				value: 'ba',
			}],
			default: { type: 'literal' as const, value: 'ab' }
		},
	},
	shader: `#version 300 es
		precision highp float;
		
		in vec2 in_uv;
		uniform sampler2D u_texture;
		uniform vec2 u_resolution;
		
		uniform float thresholdLow;
		uniform float thresholdHigh;
		out vec4 out_color;

		//"Random" function borrowed from The Book of Shaders: Random
		float random ( vec2 xy ) {
				return fract( sin( dot( xy.xy, vec2(12, 78) ) ) );
		}
		
		float luminance(vec4 color)
		{
				return ( (color.r * 0.3) + (color.g * 0.6) + (color.b * 0.1) ) * color.a;
		}
		
		// Returns the y coordinate of the first pixel that is brighter than the threshold
		float getFirstThresholdPixel(vec2 xy, float threshold, vec2 resolution)
		{
			float luma = luminance( texture( u_texture, xy / resolution.xy ) );
		
			//Looking at every sequential pixel is very resource intensive,
			//thus, we'll increment the inspected pixel by dividing the image height in sections,
			//and add a little randomness across the x axis to hide the division of said sections
				float increment = resolution.y / (30.0 + (random( xy.xx ) * 6.0));
		
				//Check if the luminance of the current pixel is brighter than the threshold,
				//if not, check the next pixel
			while( luma <= threshold )
			{
				xy.y -= increment;
						if( xy.y <= 0.0 ) return 0.0;
				luma = luminance( texture( u_texture, xy / resolution.xy ) );
			}
		
			return xy.y;
		}
		
		//Puts 30 pixels in an array
		vec4[30] putItIn( vec2 startxy, float size, vec4 colorarray[30], vec2 resolution )
		{
				vec2 xy;
				int j;
		
				for( j = 29; j >= 0; --j )
				{
						//Divide the line of pixels into 30 sections,
						//then store the pixel found at the junction of each section
						xy = vec2(startxy.x, startxy.y + (size / 29.0) * float(j));
		
						colorarray[j] = texture( u_texture, xy / resolution.xy );
				}
		
				return colorarray;
		}
		
		//An attempt at Bubble sort for 30 pixels, sorting them from darkest to brightest, top to bottom
		vec4[30] sortArray(vec4 colorarray[30])
		{
				vec4 tempcolor;
				int j;
				int swapped = 1;
		
				while( swapped > 0 )
				{
					swapped = 0;
					for( j = 29; j > 0; --j )
					{
							if( luminance(colorarray[j]) > luminance(colorarray[j - 1]) )
							{
									tempcolor = colorarray[j];
									colorarray[j] = colorarray[j - 1];
									colorarray[j - 1] = tempcolor;
		
									++swapped;
							}
					}
				}
		
				return colorarray;
		}
		
		void main() {
				vec2 new_uv = in_uv * u_resolution.xy;
		
				float firsty = getFirstThresholdPixel( vec2(new_uv.x, u_resolution.y), thresholdLow, u_resolution );
				float secondy = getFirstThresholdPixel( vec2(new_uv.x, firsty) - 1.0, thresholdHigh, u_resolution );
		
				//Only work on the pixels that are between the two threshold pixels
				if( new_uv.y < firsty && new_uv.y > secondy ) {
					float size = firsty - secondy;
		
					vec4 colorarray[30];
					colorarray = putItIn( vec2(new_uv.x, secondy), size, colorarray, u_resolution );
					colorarray = sortArray( colorarray );
		
					float sectionSize = size / 29.0;
					float location = floor( (new_uv.y - secondy) / sectionSize );
					float bottom = secondy + (sectionSize * location);
					float locationBetween = (new_uv.y - bottom) / sectionSize;
		
					// A simple method for "fading" between the colors of our ten sampled pixels
					vec4 topColor = colorarray[int(location) + 1] * locationBetween;
					vec4 bottomColor = colorarray[int(location)] * (1.0 - locationBetween);
		
					out_color = topColor + bottomColor;
				}
				else
				{
					out_color = texture( u_texture, (new_uv.xy / u_resolution.xy) );
				}
		}
	`,
	setup: ({ gl, params, shaderProgram }) => {
		const thresholdLow = gl.getUniformLocation(shaderProgram, 'thresholdLow');
		gl.uniform1f(thresholdLow, params.thresholdLow / 255);
		const thresholdHigh = gl.getUniformLocation(shaderProgram, 'thresholdHigh');
		gl.uniform1f(thresholdHigh, params.thresholdHigh / 255);
	},
});
