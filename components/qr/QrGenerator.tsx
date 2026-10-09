'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Download, Printer, ScanSearch } from 'lucide-react';
import { bins } from '@/data/bins';

export function QrGenerator() {
  const [slug, setSlug] = useState(bins[0].slug);
  const bin = bins.find((item) => item.slug === slug) ?? bins[0];

  return (
    <main className="generator-page">
      <div className="generator-intro">
        <span className="eyebrow"><ScanSearch size={14} /> ETIQUETAS DE REALIDAD AUMENTADA</span>
        <h1>Una etiqueta AR para cada bote.</h1>
        <p>Imprime la etiqueta completa y pégala en el contenedor. Su QR abre directamente la experiencia AR y el diseño permite anclar los paneles a la posición física de la etiqueta.</p>
      </div>
      <div className="generator-layout">
        <section className="generator-controls">
          <label htmlFor="bin-select">Selecciona la categoría del bote</label>
          <select id="bin-select" value={slug} onChange={(event) => setSlug(event.target.value)}>
            {bins.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
          </select>
          <p className="form-hint">Imprime la etiqueta sin recortar ni deformar su patrón. La cámara necesita HTTPS y el marcador visible para mantener el seguimiento espacial.</p>
          <div className="generator-actions">
            <a className="button button-primary" href={`/ar/labels/${slug}.png`} download={`trashcan-ar-${slug}.png`}><Download size={18} /> Descargar etiqueta</a>
            <button className="button button-outline" onClick={() => window.print()}><Printer size={18} /> Imprimir</button>
          </div>
        </section>
        <section className="qr-preview" aria-label="Vista previa de la etiqueta AR">
          <div className="print-card label-preview">
            <Image className="ar-label-preview" src={`/ar/labels/${slug}.png`} width={1000} height={1320} unoptimized alt={`Etiqueta AR para ${bin.name}`} />
          </div>
          <p><ScanSearch size={14} /> Marcador real para seguimiento MindAR</p>
        </section>
      </div>
      <div className="generator-footnote">Las etiquetas existentes contienen enlaces /bote/ que ahora redirigen automáticamente a la experiencia AR. No necesitas reimprimirlas solo para cambiar la ruta.</div>
    </main>
  );
}
