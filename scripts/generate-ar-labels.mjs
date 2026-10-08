import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { OfflineCompiler } from 'mind-ar/src/image-target/offline-compiler.js';
import { bins } from '../data/bins.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const labelsDir = path.join(root, 'public/ar/labels');
const targetsDir = path.join(root, 'public/ar/targets');
const width = 1000;
const height = 1320;
const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://trashcan.eradimension.dev').replace(/\/$/, '');

function motif(index, color) {
  const paths = [];
  for (let i = 0; i < 11; i += 1) {
    const x = 66 + i * 81;
    const y = 190 + ((i * 71 + index * 43) % 250);
    const radius = 12 + ((i * 13 + index * 7) % 23);
    paths.push(`<circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="#ffffff" stroke-opacity=".38" stroke-width="${2 + (i % 3)}"/>`);
    paths.push(`<path d="M${x - radius * 1.7} ${y + radius * 1.6}l${radius * 1.2} ${-radius * 2.4}l${radius * 1.2} ${radius * 2.4}" fill="none" stroke="#ffffff" stroke-opacity=".25" stroke-width="3"/>`);
  }
  const offset = index * 31;
  return `<g aria-hidden="true">${paths.join('')}<path d="M${70 + offset} 655C220 530 300 760 460 620S740 510 930 665" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="5"/><path d="M82 705h835" stroke="#ffffff" stroke-opacity=".28" stroke-width="2"/><circle cx="500" cy="520" r="158" fill="${color}" fill-opacity=".20" stroke="#ffffff" stroke-opacity=".35" stroke-width="3"/></g>`;
}

async function createLabel(bin, index) {
  const qr = await QRCode.toString(`${baseUrl}/bote/${bin.slug}`, {
    type: 'svg', margin: 2, errorCorrectionLevel: 'H', color: { dark: '#18372b', light: '#ffffff' },
  });
  const qrContent = qr.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1];
  if (!qrContent) throw new Error(`No se pudo generar el QR de ${bin.slug}`);
  const titleSize = bin.name.length > 18 ? 45 : 58;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="1000" height="1320" rx="44" fill="#ffffff"/>
  <rect x="14" y="14" width="972" height="1292" rx="34" fill="none" stroke="#18372b" stroke-width="8"/>
  <path d="M48 48h904v740H48z" rx="24" fill="${bin.color}"/>
  ${motif(index, bin.color)}
  <text x="88" y="116" fill="#ffffff" font-family="Arial,sans-serif" font-size="33" font-weight="700" letter-spacing="4">TraShCan</text>
  <text x="912" y="116" fill="#ffffff" text-anchor="end" font-family="Arial,sans-serif" font-size="23" font-weight="600" letter-spacing="3">SEPARACIÓN</text>
  <path d="M88 150h824" stroke="#ffffff" stroke-opacity=".42" stroke-width="2"/>
  <text x="500" y="270" fill="#ffffff" text-anchor="middle" font-family="Arial,sans-serif" font-size="${titleSize}" font-weight="700">${escapeXml(bin.name.toLocaleUpperCase('es'))}</text>
  <text x="500" y="334" fill="#ffffff" fill-opacity=".9" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" letter-spacing="2">ETIQUETA CON SEGUIMIENTO AR</text>
  <g transform="translate(500 535)" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity=".95">
    <path d="M0-105L91-52M92-49L58-48M92-49L78-80"/><path d="M91-51L44 31M42 33L59 3M42 33L75 35"/>
    <path d="M44 32L-51 32M-53 32L-30 49M-53 32L-30 14"/><path d="M-51 31L-96-48M-97-51L-104-20M-97-51L-66-44"/>
    <path d="M-95-50L-48-105M-49-106L-52-75M-49-106L-20-91"/><path d="M-48-105L0-105"/>
  </g>
  <rect x="245" y="800" width="510" height="510" rx="32" fill="#f5f8f2" stroke="#dce7d9" stroke-width="4"/>
  <svg x="330" y="875" width="340" height="340" viewBox="0 0 45 45" shape-rendering="crispEdges">${qrContent}</svg>
  <text x="500" y="1250" fill="#18372b" text-anchor="middle" font-family="Arial,sans-serif" font-size="29" font-weight="700">Escanea y descubre qué puedes tirar</text>
  <text x="500" y="1285" fill="#708078" text-anchor="middle" font-family="Arial,sans-serif" font-size="18">Apunta a la etiqueta y pulsa “Ver en realidad aumentada”</text>
</svg>`;

  const svgPath = path.join(labelsDir, `${bin.slug}.svg`);
  const pngPath = path.join(labelsDir, `${bin.slug}.png`);
  await writeFile(svgPath, svg, 'utf8');
  const image = await loadImage(Buffer.from(svg));
  const canvas = createCanvas(width, height);
  canvas.getContext('2d').drawImage(image, 0, 0, width, height);
  await writeFile(pngPath, canvas.toBuffer('image/png'));
  return pngPath;
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

await mkdir(labelsDir, { recursive: true });
await mkdir(targetsDir, { recursive: true });
const labelPaths = [];
for (const [index, bin] of bins.entries()) {
  labelPaths.push(await createLabel(bin, index));
  console.log(`Etiqueta creada: ${bin.slug}`);
}

const images = await Promise.all(labelPaths.map((file) => loadImage(file)));
const compiler = new OfflineCompiler();
await compiler.compileImageTargets(images, (progress) => {
  if (Math.floor(progress) % 10 === 0) console.log(`Compilando marcadores: ${Math.floor(progress)}%`);
});
const targetData = compiler.exportData();
await writeFile(path.join(targetsDir, 'trashcan-labels.mind'), Buffer.from(targetData));
console.log(`Marcador MindAR generado con ${bins.length} objetivos: public/ar/targets/trashcan-labels.mind`);
