import * as msgpack from '@msgpack/msgpack';
import type { RawPreset, RawProject } from './settings';
import type { Asset } from '@glitch/shared/types.ts';

type DecodedImage = { width: number; height: number; data: Uint8Array };

async function loadImageFromBuffer(image: Uint8Array, type: string): Promise<DecodedImage> {
	console.log('image', image);
	console.log('type', type);

	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
		reader.onload = () => {
			const img = new Image();
			img.onerror = () => reject(new Error('Could not decode image'));
			img.onload = async () => {
				const canvas = window.document.createElement('canvas');
				canvas.width = img.width;
				canvas.height = img.height;
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					reject(new Error('Could not create a 2D canvas context'));
					return;
				}
				ctx.drawImage(img, 0, 0);
				const data = ctx.getImageData(0, 0, img.width, img.height).data;
				resolve({
					width: img.width,
					height: img.height,
					data: new Uint8Array(data),
				});
			};
			img.src = reader.result as string;
		};
		reader.readAsDataURL(new Blob([new Uint8Array(image)], { type }));
	});
}

export function decodeAssets(assets: Omit<Asset, 'data'>[]) {
	return Promise.all(assets.map(async asset => ({
		id: asset.id,
		name: asset.name,
		width: asset.width,
		height: asset.height,
		data: asset.fileDataType.startsWith('image/') ? (await loadImageFromBuffer(asset.fileData, asset.fileDataType)).data : null,
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

export function openImageOrVideoFile(options: { multiple?: boolean } = {}): Promise<{
	width: number;
	height: number;
	data: Uint8Array | null;
	name: string;
	type: string;
	fileData: Blob;
	hash?: string;
}> {
	return new Promise((resolve, reject) => {
		const input = window.document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*,video/*';
		input.multiple = options.multiple ?? false;
		input.onchange = () => {
			const file = input.files?.[0];
			if (file == null) return;
			const reader = new FileReader();
			reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
			reader.onload = () => {
				if (file.type.startsWith('image/')) {
					const img = new Image();
					img.onerror = () => reject(new Error('Could not decode image'));
					img.onload = async () => {
						const canvas = window.document.createElement('canvas');
						canvas.width = img.width;
						canvas.height = img.height;
						const ctx = canvas.getContext('2d');
						if (!ctx) {
							reject(new Error('Could not create a 2D canvas context'));
							return;
						}
						ctx.drawImage(img, 0, 0);
						const data = ctx.getImageData(0, 0, img.width, img.height).data;
						console.log(file.type + ' ' + file.name);
						resolve({
							width: img.width,
							height: img.height,
							data: new Uint8Array(data),
							name: file.name,
							type: file.type,
							fileData: file,
						});
					};
					img.src = reader.result as string;
				} else if (file.type.startsWith('video/')) {
					const video = window.document.createElement('video');
					video.onerror = () => reject(new Error('Could not decode video'));
					video.onloadeddata = async () => {
						resolve({
							width: video.videoWidth,
							height: video.videoHeight,
							data: null,
							name: file.name,
							type: file.type,
							fileData: file,
						});
						video.remove();
					};
					video.src = reader.result as string;
				}
			};
			reader.readAsDataURL(file);
		};
		input.click();
	});
}

export function openPresetFile(_options: Record<string, never> = {}): Promise<{
	preset: RawPreset;
	name: string;
}> {
	return new Promise((resolve, reject) => {
		const input = window.document.createElement('input');
		input.type = 'file';
		input.accept = '.gspreset';
		input.multiple = false;
		input.onchange = () => {
			const file = input.files?.[0];
			if (file == null) return;
			if (file.stream) {
				msgpack.decodeAsync(file.stream()).then(parsed => {
					resolve({
						preset: parsed as RawPreset,
						name: file.name,
					});
				}).catch(reject);
			} else {
				file.arrayBuffer().then(buffer => {
					resolve({
						preset: msgpack.decode(buffer) as RawPreset,
						name: file.name,
					});
				}).catch(reject);
			}
		};
		input.click();
	});
}

export function exportPresetFile(preset: RawPreset) {
	console.log('exportPresetFile', preset);
	const buffer = msgpack.encode(preset); // NOTE: バイナリはUint8Arrayである必要がある
	const blob = new Blob([buffer], { type: 'application/octet-stream' });
	const url = URL.createObjectURL(blob);
	const a = window.document.createElement('a');
	a.href = url;
	a.download = `${preset.name}.gspreset`;
	a.click();
	URL.revokeObjectURL(url);
}

export function saveProjectFile(project: RawProject) {
	console.log('saveProjectFile', project);
	const buffer = msgpack.encode(project); // NOTE: バイナリはUint8Arrayである必要がある
	const blob = new Blob([buffer], { type: 'application/octet-stream' });
	const url = URL.createObjectURL(blob);
	const a = window.document.createElement('a');
	a.href = url;
	a.download = `${project.name}.gsproj`;
	a.click();
	URL.revokeObjectURL(url);
}

export function loadProjectFile(): Promise<{
	project: RawProject;
	name: string;
}> {
	return new Promise((resolve, reject) => {
		const input = window.document.createElement('input');
		input.type = 'file';
		input.accept = '.gsproj';
		input.multiple = false;
		input.onchange = () => {
			const file = input.files?.[0];
			if (file == null) return;
			if (file.stream) {
				msgpack.decodeAsync(file.stream()).then(parsed => {
					resolve({
						project: parsed as RawProject,
						name: file.name,
					});
				}).catch(reject);
			} else {
				file.arrayBuffer().then(buffer => {
					resolve({
						project: msgpack.decode(buffer) as RawProject,
						name: file.name,
					});
				}).catch(reject);
			}
		};
		input.click();
	});
}
