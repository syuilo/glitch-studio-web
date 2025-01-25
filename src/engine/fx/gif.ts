import { basicParamDefs, defineGpuFx } from '@/engine/fx-utils';
import shaderSrc from './gif.glsl';

let shaderCache: WebGLProgram;

var needsDisposal = false;

export default defineGpuFx({
	name: 'gif',
	displayName: 'GIF',
	category: '',
	paramDefs: {
		image: {
			label: 'Image',
			type: 'image' as const,
			default: { type: 'literal' as const, value: null }
		},
		sizeMode: {
			label: 'Size mode',
			type: 'enum' as const,
			options: [{
				label: 'Stretch',
				value: 0,
			}, {
				label: 'Contain',
				value: 1,
			}, {
				label: 'Cover',
				value: 2,
			}],
			default: { type: 'literal' as const, value: 2 }
		},
		frame: {
			label: 'Frame',
			type: 'number' as const,
			default: { type: 'expression' as const, value: 'FRAME' }
		},
	},
	main: ({ renderer, gl, resultFrameBuffer, width, height, params }) => {
		const shader = shaderCache ?? renderer.initShaderProgram(`#version 300 es
			in vec2 position;
			out vec2 in_uv;

			void main() {
				in_uv = (position + 1.0) / 2.0;
				gl_Position = vec4(position, 0.0, 1.0);
			}
		`, shaderSrc);
		if (shaderCache == null) shaderCache = shader;

		gl.useProgram(shader);

		const info = renderer.gifs.get(params.image);
		if (info == null) return;

		if (needsDisposal) {
			info.gifCanvasCtx.clearRect(0, 0, info.canvas.width, info.canvas.height)
			needsDisposal = false
		}	

		const frame = info.frames[params.frame];
		info.canvas.width = frame.dims.width;
		info.canvas.height = frame.dims.height;

		info.gifCanvas.width = info.canvas.width;
		info.gifCanvas.height = info.canvas.height;
		//info.gifCanvasCtx.clearRect(0, 0, frame.dims.width, frame.dims.height)
		if (
			!info.frameImageData ||
			frame.dims.width !== info.frameImageData.width ||
			frame.dims.height !== info.frameImageData.height
		) {
			info.tempCanvas.width = frame.dims.width;
			info.tempCanvas.height = frame.dims.height;
			info.frameImageData = info.tempCanvasCtx.createImageData(frame.dims.width, frame.dims.height);
		}

		// set the patch data as an override
		info.frameImageData.data.set(frame.patch);

		// draw the patch back over the canvas
		info.tempCanvasCtx.putImageData(info.frameImageData, 0, 0);
	
		info.gifCanvasCtx.drawImage(info.tempCanvas, frame.dims.left, frame.dims.top);

		const pixelPercent = 100;
		const imageData = info.gifCanvasCtx.getImageData(0, 0, info.gifCanvas.width, info.gifCanvas.height);
		const pixelsX = 5 + Math.floor((pixelPercent / 100) * (info.canvas.width - 5));
		const pixelsY = (pixelsX * info.canvas.height) / info.canvas.width;

		if (pixelPercent != 100) {
			info.canvasCtx.mozImageSmoothingEnabled = false;
			info.canvasCtx.webkitImageSmoothingEnabled = false;
			info.canvasCtx.imageSmoothingEnabled = false;
		}

		info.canvasCtx.putImageData(imageData, 0, 0);
		info.canvasCtx.drawImage(info.canvas, 0, 0, info.canvas.width, info.canvas.height, 0, 0, pixelsX, pixelsY);
		info.canvasCtx.drawImage(info.canvas, 0, 0, pixelsX, pixelsY, 0, 0, info.canvas.width, info.canvas.height);

		if (frame.disposalType === 2) {
			needsDisposal = true
		}

		const imageTex = (params.image ? renderer.assetTextures.get(params.image) : renderer.placeholderTexture) ?? renderer.placeholderTexture;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, imageTex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, info.canvas);

		const u_resolution = gl.getUniformLocation(shader, 'u_resolution');
		gl.uniform2fv(u_resolution, [width, height]);

		const u_texture_resolution = gl.getUniformLocation(shader, 'u_texture_resolution');
		gl.uniform2fv(u_texture_resolution, [renderer.webcameraWidth, renderer.webcameraHeight]);

		const u_size_mode = gl.getUniformLocation(shader, 'u_size_mode');
		gl.uniform1i(u_size_mode, params.sizeMode);

		const positionLocation = gl.getAttribLocation(shader, 'position');
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(positionLocation);

		gl.drawArrays(gl.TRIANGLES, 0, 6);

		gl.bindTexture(gl.TEXTURE_2D, null);
	}
});
