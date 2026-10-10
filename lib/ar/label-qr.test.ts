import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { BinaryBitmap, DecodeHintType, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from '@zxing/library';
import { describe, expect, it } from 'vitest';
import { markerTargets } from '@/lib/ar/marker-config';
import { markerLabelGeometry } from '@/lib/ar/label-geometry';

describe('QR incrustado en las etiquetas AR', () => {
  it.each(markerTargets)('decodifica el enlace de $slug desde su PNG final', async ({ slug }) => {
    const imagePath = path.join(process.cwd(), 'public', 'ar', 'labels', `${slug}.png`);
    const svg = readFileSync(path.join(process.cwd(), 'public', 'ar', 'labels', `${slug}.svg`), 'utf8');
    const expected = svg.match(/QR: (https?:\/\/[^<]+)<\/desc>/)?.[1];
    const image = await loadImage(imagePath);
    const canvas = createCanvas(markerLabelGeometry.qrSize, markerLabelGeometry.qrSize);
    const context = canvas.getContext('2d');
    context.drawImage(image, markerLabelGeometry.qrX, markerLabelGeometry.qrY, markerLabelGeometry.qrSize, markerLabelGeometry.qrSize, 0, 0, markerLabelGeometry.qrSize, markerLabelGeometry.qrSize);
    const pixels = context.getImageData(0, 0, markerLabelGeometry.qrSize, markerLabelGeometry.qrSize);
    const packedPixels = new Int32Array(markerLabelGeometry.qrSize * markerLabelGeometry.qrSize);
    for (let pixel = 0, rgba = 0; pixel < packedPixels.length; pixel += 1, rgba += 4) {
      packedPixels[pixel] = (pixels.data[rgba] << 16) | (pixels.data[rgba + 1] << 8) | pixels.data[rgba + 2];
    }
    const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(packedPixels, markerLabelGeometry.qrSize, markerLabelGeometry.qrSize)));
    const hints = new Map([[DecodeHintType.PURE_BARCODE, true]]);
    const decodedUrl = new URL(new QRCodeReader().decode(bitmap, hints).getText());

    expect(expected).toBeTruthy();
    expect(decodedUrl.pathname).toBe(`/bote/${slug}`);
    expect(decodedUrl.origin).toBe(new URL(expected!).origin);
  }, 10_000);
});
