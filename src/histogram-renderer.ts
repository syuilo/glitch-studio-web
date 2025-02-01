let dst: HTMLCanvasElement;
let dstCtx: CanvasRenderingContext2D;
let dstWidth: number;
let dstHeight: number;

self.onmessage = (event) => {
	if (event.data.imageData != null) {
		renderHistogram(event.data.imageData);
	} else {
		dst = event.data.dst as HTMLCanvasElement;
		dstCtx = dst.getContext('2d')!;
		dstWidth = event.data.dstWidth as number;
		dstHeight = event.data.dstHeight as number;
	}
};

function renderHistogram(imageData: Uint8ClampedArray<ArrayBufferLike>) {
	const histogram = calcHistogram(imageData);
	
	dstCtx.clearRect(0, 0, dstWidth, dstHeight);
	dstCtx.globalCompositeOperation = 'lighter';
	dstCtx.lineWidth = 1;

	//#region Draw grid
	dstCtx.strokeStyle = 'rgba(255, 255, 255, 0.07)';

	// X axis
	const xLines = 6;
	for (let i = 0; i <= xLines; i++) {
		dstCtx.beginPath();
		dstCtx.moveTo(Math.floor(i * ((dstWidth - 1) / xLines)) + 0.5, 0);
		dstCtx.lineTo(Math.floor(i * ((dstWidth - 1) / xLines)) + 0.5, dstHeight);
		dstCtx.closePath();
		dstCtx.stroke();
	}

	// Y axis
	const yLines = 6;
	for (let i = 0; i <= yLines; i++) {
		dstCtx.beginPath();
		dstCtx.moveTo(0, Math.floor(i * ((dstHeight - 1) / yLines)) + 0.5);
		dstCtx.lineTo(dstWidth, Math.floor(i * ((dstHeight - 1) / yLines)) + 0.5);
		dstCtx.closePath();
		dstCtx.stroke();
	}
	//#endregion

	for (let i = 0; i < 256; i++) {
		const r = (histogram.bins.r[i] / histogram.rgbMax) * dstHeight;
		dstCtx.strokeStyle = `rgb(${i}, 0, 0)`;
		dstCtx.beginPath();
		dstCtx.moveTo(i + 0.5, 255);
		dstCtx.lineTo(i + 0.5, Math.max(0, dstHeight - r));
		dstCtx.closePath();
		dstCtx.stroke();

		const g = (histogram.bins.g[i] / histogram.rgbMax) * dstHeight;
		dstCtx.strokeStyle = `rgb(0, ${i}, 0)`;
		dstCtx.beginPath();
		dstCtx.moveTo(i + 0.5, 255);
		dstCtx.lineTo(i + 0.5, dstHeight - g);
		dstCtx.closePath();
		dstCtx.stroke();

		const b = (histogram.bins.b[i] / histogram.rgbMax) * dstHeight;
		dstCtx.strokeStyle = `rgb(0, 0, ${i})`;
		dstCtx.beginPath();
		dstCtx.moveTo(i + 0.5, 255);
		dstCtx.lineTo(i + 0.5, dstHeight - b);
		dstCtx.closePath();
		dstCtx.stroke();
	}
}

function calcHistogram(image: Uint8ClampedArray<ArrayBufferLike>) {
	const bins = {
		r: [] as number[],
		g: [] as number[],
		b: [] as number[],
	};

	for (var i = 0; i < 256; i++) {
		bins.r[i] = 0;
		bins.g[i] = 0;
		bins.b[i] = 0;
	}

	for (let i = 0; i < image.length; i += 4) {
		bins.r[image[i]]++;
		bins.g[image[i + 1]]++;
		bins.b[image[i + 2]]++;
	}

	let max = 0;
	for (const ch of ['r' as const, 'g' as const, 'b' as const]) {
		for (let i = 0; i < 256; i++) {
			max = Math.max(max, bins[ch][i]);
		}
	}

	let rAmount = 0;
	let gAmount = 0;
	let bAmount = 0;
	for (let i = 0; i < 256; i++) {
		rAmount += i * bins.r[i];
		gAmount += i * bins.g[i];
		bAmount += i * bins.b[i];
	}
	const amountMax = Math.max(rAmount, gAmount, bAmount);
	const amountMin = Math.min(rAmount, gAmount, bAmount);

	const rMax = Math.max(...bins.r.slice(1, 255)); // 両端はグラフにしたときに邪魔なのでカット
	const gMax = Math.max(...bins.g.slice(1, 255)); // 両端はグラフにしたときに邪魔なのでカット
	const bMax = Math.max(...bins.b.slice(1, 255)); // 両端はグラフにしたときに邪魔なのでカット
	const rgbMax = Math.max(rMax, gMax, bMax);

	return {
		bins, max, rAmount, gAmount, bAmount, amountMax, amountMin, rMax, gMax, bMax, rgbMax
	};
}