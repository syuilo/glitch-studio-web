import type { Asset, Image } from './types';
import imageType from 'image-type';
import { PNG } from 'pngjs/browser';
import JPEG from 'jpeg-js';
import { Preset, RawPreset } from './settings';
import * as msgpack from '@msgpack/msgpack';

const TODO = () => {};

export type GsImage = {
	width: number;
	height: number;
	data: Uint8Array;
};

async function loadImageFromBuffer(image: Uint8Array, type: string): Promise<Image> {
	console.log('image', image);
	console.log('type', type);

	if (type === 'image/png') {
		const png = PNG.sync.read(image);
		return {
			width: png.width,
			height: png.height,
			data: new Uint8Array(png.data),
		};
	} else if (type === 'image/gif') {
		const gif = GIF.parseGIF(image);
		return {
			width: gif.lsd.width,
			height: gif.lsd.height,
			data: null,
		};
	} else if (type === 'image/jpeg') {
		return JPEG.decode(image, { useTArray: true });
	//} else if (type === 'image/tiff') {
	//	const ifds = TIFF.decode(image)[0];
	//	TIFF.decodeImage(image, ifds);
	//	return {
	//		width: ifds.width,
	//		height: ifds.height,
	//		data: TIFF.toRGBA8(ifds),
	//	};
	} else {
		throw new Error('Unsupported image type: ' + type);
	}
}

export function decodeAssets(assets: Omit<Asset, 'data'>[]) {
	return Promise.all(assets.map(async asset => ({
		id: asset.id,
		name: asset.name,
		width: asset.width,
		height: asset.height,
		data: (await loadImageFromBuffer(new Uint8Array(asset.fileData), asset.fileDataType)).data,
		fileDataType: asset.fileDataType,
		fileData: asset.fileData,
		hash: asset.hash,
	})));
}

export function encodeAssets(assets: Asset[]): Omit<Asset, 'data'>[] {
	return assets.map(asset => ({
		id: asset.id,
		name: asset.name,
		width: asset.width,
		height: asset.height,
		fileDataType: asset.fileDataType,
		fileData: asset.fileData,
		hash: asset.hash,
	}));
}

export function openImageFile(options): Promise<{
	img: GsImage;
	name: string;
	type: string;
	fileData: Uint8Array;
}> {
	return new Promise((resolve, reject) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.multiple = options.multiple ?? false;
		input.onchange = () => {
			const file = input.files?.[0];
			if (file == null) return;
			const reader = new FileReader();
			reader.onload = () => {
				const img = new Image();
				img.onload = async () => {
					const canvas = document.createElement('canvas');
					canvas.width = img.width;
					canvas.height = img.height;
					const ctx = canvas.getContext('2d');
					ctx?.drawImage(img, 0, 0);
					const data = ctx?.getImageData(0, 0, img.width, img.height).data;
					console.log(file.type + ' ' + file.name);
					resolve({
						img: {
							width: img.width,
							height: img.height,
							data: new Uint8Array(data),
						},
						name: file.name,
						type: file.type,
						fileData: new Uint8Array(await file.arrayBuffer()),
					});
				};
				img.src = reader.result as string;
			};
			reader.readAsDataURL(file);
		};
		input.click();
	});
}

export function openPresetFile(options): Promise<{
	preset: RawPreset;
	name: string;
}> {
	return new Promise((resolve, reject) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.gspreset';
		input.multiple = false;
		input.onchange = () => {
			const file = input.files?.[0];
			if (file == null) return;
			if (file.stream) {
				msgpack.decodeAsync(file.stream()).then(parsed => {
					resolve({
						preset: parsed,
						name: file.name,
					});
				});
			} else {
				file.arrayBuffer().then(buffer => {
					resolve({
						preset: msgpack.decode(buffer),
						name: file.name,
					});
				});
			}
		};
		input.click();
	});
}

export function exportPreset(preset: RawPreset) {
	console.log('exportPreset', preset);
	const buffer = msgpack.encode(preset); // NOTE: バイナリはUint8Arrayである必要がある
	const blob = new Blob([buffer], { type: 'application/octet-stream' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${preset.name}.gspreset`;
	a.click();
	URL.revokeObjectURL(url);
}
