import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { OfflineCompiler } from 'mind-ar/src/image-target/offline-compiler.js';
import { bins } from '../data/bins.ts';
import { markerLabelGeometry } from '../lib/ar/label-geometry.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const labelsDir = path.join(root, 'public/ar/labels');
const targetsDir = path.join(root, 'public/ar/targets');
const { width, height } = markerLabelGeometry;
const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://trashcan.eradimension.dev').replace(/\/$/, '');

function motif(index, color) {
  const shapes = [];
  for (let i = 0; i < 22; i += 1) {
    const side = i % 2 === 0 ? 34 : 19;
    const x = 62 + ((i * 173 + index * 97) % 876);
    const y = 350 + ((i * 89 + index * 131) % 430);
    if (i % 3 === 0) shapes.push(`<path d="M${x} ${y}l${side} ${-side * 1.5} ${side} ${side * 1.5}Z" fill="${color}" fill-opacity="${i % 2 ? '.19' : '.32'}"/>`);
    else shapes.push(`<circle cx="${x}" cy="${y}" r="${side / 2}" fill="none" stroke="${i % 2 ? '#18372b' : '#ffffff'}" stroke-opacity=".35" stroke-width="${i % 4 === 0 ? 5 : 3}"/>`);
  }
  const wave = 420 + index * 17;
  return `<g aria-hidden="true">${shapes.join('')}<path d="M54 ${wave}c155-100 219 83 371-2s265-82 521-2" fill="none" stroke="#18372b" stroke-opacity=".25" stroke-width="5"/><path d="M80 735h840" stroke="#fff" stroke-opacity=".48" stroke-width="2"/><circle cx="500" cy="548" r="168" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="2" stroke-dasharray="3 11"/></g>`;
}

function labelIllustration(icon, color) {
  const common = `fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"`;
  const drawings = {
    leaf: `<path d="M-8 45c-5-70 45-120 132-135-4 88-49 134-132 135Zm-1 1 73-83" ${common}/><path d="M-8 15c-42 2-63-25-61-70 42-1 65 26 61 70Z" fill="#fff" fill-opacity=".25" stroke="#fff" stroke-width="9"/>`,
    bottle: `<path d="M-23-95h46v34l24 22v119a18 18 0 0 1-18 18h-58a18 18 0 0 1-18-18V-39l24-22Z" ${common}/><path d="M-40-4h80v42h-80zM-16-119h32v24h-32z" fill="#fff" fill-opacity=".26" stroke="#fff" stroke-width="9"/>`,
    file: `<path d="M-70-102h85l55 52v151H-70zM15-102v55h55M-43-15h85m-85 34h85m-85 34h66" ${common}/><path d="m-87 111 38-21 38 21-38 22Zm0 0v36l38 22v-36Zm76 0v36l-38 22v-36Z" fill="#fff" fill-opacity=".24" stroke="#fff" stroke-width="8"/>`,
    glass: `<path d="M-23-103h46v35l27 27v119a19 19 0 0 1-19 19h-62a19 19 0 0 1-19-19V-41l27-27Z" ${common}/><path d="M-48 11h96v66a18 18 0 0 1-18 18h-60a18 18 0 0 1-18-18Z" fill="#fff" fill-opacity=".28" stroke="#fff" stroke-width="8"/><path d="m-90-83 12-22 12 22m91 12 10-18 10 18" ${common}/>` ,
    trash: `<path d="M-72-58h144l-12 141a19 19 0 0 1-19 17h-82a19 19 0 0 1-19-17Zm-15-24h174v24H-87Zm48-26h96v24h-96Zm-2 78v78m82-78v78" ${common}/><path d="M-39 4h78" stroke="#fff" stroke-width="9" stroke-linecap="round"/>`,
    zap: `<rect x="-69" y="-100" width="138" height="201" rx="23" ${common}/><rect x="-54" y="-81" width="108" height="140" rx="8" fill="#fff" fill-opacity=".2" stroke="#fff" stroke-width="7"/><path d="m11-60-43 78h34l-11 58 51-84H5Z" fill="#fff" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>`,
  };
  return `<g transform="translate(500 548)" color="${color}">${drawings[icon]}</g>`;
}

async function createLabel(bin, index) {
  const qrUrl = `${baseUrl}/bote/${bin.slug}`;
  const qrCode = QRCode.create(qrUrl, { errorCorrectionLevel: 'H' });
  const qrQuietZone = markerLabelGeometry.qrQuietZone;
  const qrRenderedSize = markerLabelGeometry.qrSize;
  const qrX = markerLabelGeometry.qrX;
  const qrY = markerLabelGeometry.qrY;
  const qrModuleSize = qrRenderedSize / (qrCode.modules.size + qrQuietZone * 2);
  const qrContent = [];
  for (let row = 0; row < qrCode.modules.size; row += 1) {
    for (let column = 0; column < qrCode.modules.size; column += 1) {
      if (qrCode.modules.data[row * qrCode.modules.size + column]) {
        const x = qrX + (column + qrQuietZone) * qrModuleSize;
        const y = qrY + (row + qrQuietZone) * qrModuleSize;
        qrContent.push(`<rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${qrModuleSize.toFixed(3)}" height="${qrModuleSize.toFixed(3)}"/>`);
      }
    }
  }
  const titleSize = bin.name.length > 18 ? 47 : 60;
  const code = String(index + 1).padStart(2, '0');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>TraShCan — ${escapeXml(bin.name)}</title><desc>Etiqueta impresa para ${escapeXml(bin.name)}. QR: ${escapeXml(qrUrl)}. Apunta a la ilustración para activar el seguimiento de realidad aumentada.</desc>
  <defs><linearGradient id="wash" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bin.color}"/><stop offset="1" stop-color="#244e3b"/></linearGradient><pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0v48" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2"/></pattern></defs>
  <rect width="1000" height="1320" rx="46" fill="#f8faf6"/><rect x="14" y="14" width="972" height="1292" rx="34" fill="none" stroke="#18372b" stroke-width="8"/>
  <path d="M48 48h904v740H48z" rx="24" fill="url(#wash)"/><path d="M48 48h904v740H48z" fill="url(#grid)"/>
  ${motif(index, bin.color)}
  <path d="M84 86h832v2" stroke="#fff" stroke-opacity=".48" stroke-width="2"/>
  <text x="88" y="124" fill="#fff" font-family="Arial,sans-serif" font-size="34" font-weight="700" letter-spacing="3">TraShCan</text>
  <text x="912" y="124" fill="#fff" text-anchor="end" font-family="Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="2">ETIQUETA AR · ${code}</text>
  <path d="M88 157h824" stroke="#fff" stroke-opacity=".45" stroke-width="2"/>
  <text x="500" y="258" fill="#fff" text-anchor="middle" font-family="Arial,sans-serif" font-size="${titleSize}" font-weight="700">${escapeXml(bin.name.toLocaleUpperCase('es'))}</text>
  <text x="500" y="308" fill="#fff" fill-opacity=".9" text-anchor="middle" font-family="Arial,sans-serif" font-size="21" font-weight="600" letter-spacing="3">SEPARA · RECONOCE · RECUPERA</text>
  ${labelIllustration(bin.icon, bin.color)}
  <g fill="#fff" fill-opacity=".95"><circle cx="113" cy="520" r="8"/><circle cx="884" cy="571" r="11"/><path d="M158 578l14-25 14 25Zm656-83 12-21 12 21Z"/></g>
  <rect x="${markerLabelGeometry.qrCardLeft}" y="${markerLabelGeometry.qrCardTop}" width="${markerLabelGeometry.qrCardSize}" height="${markerLabelGeometry.qrCardSize}" rx="30" fill="#fff" stroke="#18372b" stroke-width="4"/>
  <text x="500" y="838" fill="#536b5d" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" letter-spacing="2">ABRE LA GUÍA</text>
  <g fill="#18372b" shape-rendering="crispEdges">${qrContent.join('')}</g>
  <text x="500" y="1273" fill="#18372b" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700">Escanea y descubre qué puedes tirar</text>
  <text x="500" y="1297" fill="#708078" text-anchor="middle" font-family="Arial,sans-serif" font-size="16">El diseño completo funciona como marcador AR</text>
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

async function createPrintSheet(labelPaths) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const labelWidth = 180;
  const labelHeight = labelWidth * height / width;
  const gapX = 18;
  const gapY = 16;
  const topMargin = (pageHeight - 3 * labelHeight - 2 * gapY) / 2;
  const objects = [null];
  const reserve = () => { objects.push(null); return objects.length - 1; };
  const catalogId = reserve();
  const pagesId = reserve();
  const pageId = reserve();
  const contentId = reserve();
  const imageIds = [];
  const drawingCommands = [];
  for (let i = 0; i < labelPaths.length; i += 1) {
    const image = await loadImage(labelPaths[i]);
    const canvas = createCanvas(width, height);
    canvas.getContext('2d').drawImage(image, 0, 0, width, height);
    const jpeg = canvas.toBuffer('image/jpeg', 96);
    const imageId = reserve();
    imageIds.push(imageId);
    objects[imageId] = Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
      jpeg,
      Buffer.from('\nendstream'),
    ]);
    const column = i % 2;
    const row = Math.floor(i / 2);
    const x = (pageWidth - (2 * labelWidth + gapX)) / 2 + column * (labelWidth + gapX);
    const y = pageHeight - topMargin - (row + 1) * labelHeight - row * gapY;
    drawingCommands.push(`q ${labelWidth} 0 0 ${labelHeight} ${x.toFixed(2)} ${y.toFixed(2)} cm /Label${i} Do Q`);
  }
  const content = Buffer.from(drawingCommands.join('\n'));
  objects[contentId] = Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`), content, Buffer.from('\nendstream')]);
  const xObjectResources = imageIds.map((id, i) => `/Label${i} ${id} 0 R`).join(' ');
  objects[pageId] = Buffer.from(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << ${xObjectResources} >> >> /Contents ${contentId} 0 R >>`);
  objects[pagesId] = Buffer.from(`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);
  objects[catalogId] = Buffer.from(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  const chunks = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'binary')];
  const offsets = [0];
  let byteLength = chunks[0].length;
  for (let id = 1; id < objects.length; id += 1) {
    const chunk = Buffer.concat([Buffer.from(`${id} 0 obj\n`), objects[id], Buffer.from('\nendobj\n')]);
    offsets[id] = byteLength;
    chunks.push(chunk);
    byteLength += chunk.length;
  }
  const xrefOffset = byteLength;
  const xref = [`xref\n0 ${objects.length}\n`, '0000000000 65535 f \n'];
  for (let id = 1; id < objects.length; id += 1) xref.push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  chunks.push(Buffer.from(`${xref.join('')}trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
  await writeFile(path.join(labelsDir, 'hoja-etiquetas.pdf'), Buffer.concat(chunks));
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

await mkdir(labelsDir, { recursive: true });
await mkdir(targetsDir, { recursive: true });
const labelPaths = [];
for (const [index, bin] of bins.entries()) {
  labelPaths.push(await createLabel(bin, index));
  console.log(`Etiqueta AR creada: ${bin.slug} → ${baseUrl}/bote/${bin.slug}`);
}

await createPrintSheet(labelPaths);
console.log('Hoja A4 lista para imprimir: public/ar/labels/hoja-etiquetas.pdf');
const images = await Promise.all(labelPaths.map((file) => loadImage(file)));
const compiler = new OfflineCompiler();
await compiler.compileImageTargets(images, (progress) => {
  const percent = Math.floor(progress);
  if (percent % 10 === 0) console.log(`Compilando marcadores: ${percent}%`);
});
await writeFile(path.join(targetsDir, 'trashcan-labels.mind'), Buffer.from(compiler.exportData()));
console.log(`Target MindAR regenerado a partir de las seis PNG: public/ar/targets/trashcan-labels.mind`);
