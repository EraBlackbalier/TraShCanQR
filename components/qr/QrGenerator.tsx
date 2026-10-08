'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import Image from 'next/image';
import { Download, Printer, QrCode } from 'lucide-react';
import { bins } from '@/data/bins';
import { getBinUrl } from '@/lib/qr';
import { BinIcon } from '@/components/bins/BinIcon';

export function QrGenerator() {
  const [slug, setSlug] = useState(bins[0].slug);
  const [origin, setOrigin] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const bin = bins.find((item) => item.slug === slug) ?? bins[0];
  const url = useMemo(() => getBinUrl(slug, origin || undefined), [slug, origin]);

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, { width: 480, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#173c2e', light: '#ffffff' } })
      .then((result) => { if (active) setDataUrl(result); })
      .catch(() => { if (active) setDataUrl(''); });
    return () => { active = false; };
  }, [url]);

  return (
    <main className="generator-page">
      <div className="generator-intro"><span className="eyebrow"><QrCode size={14} /> HERRAMIENTA PARA IMPRIMIR</span><h1>Un QR para cada bote.</h1><p>Genera un código listo para imprimir y colocar en el contenedor. Al escanearlo, abre la guía de separación correspondiente.</p></div>
      <div className="generator-layout">
        <section className="generator-controls">
          <label htmlFor="bin-select">1. Elige una categoría</label>
          <select id="bin-select" value={slug} onChange={(event) => setSlug(event.target.value)}>{bins.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select>
          <label htmlFor="qr-url">2. Confirma la dirección</label>
          <input id="qr-url" value={url} readOnly aria-label="Dirección contenida en el QR" />
          <p className="form-hint">En Vercel, configura <code>NEXT_PUBLIC_SITE_URL</code> con el dominio público. En desarrollo puedes usar la dirección IP local para abrir el enlace desde tu teléfono.</p>
          <div className="generator-actions"><a className={`button button-primary${!dataUrl ? ' disabled' : ''}`} href={dataUrl || undefined} download={`trashcan-${slug}.png`}><Download size={18} /> Descargar PNG</a><button className="button button-outline" onClick={() => window.print()} disabled={!dataUrl}><Printer size={18} /> Imprimir</button></div>
        </section>
        <section className="qr-preview" aria-label="Vista previa del código QR"><div className="print-card"><div className="print-brand"><span className="brand-mark"><QrCode size={18} /></span> TraShCan<span className="brand-dot">.</span></div>{dataUrl ? <Image src={dataUrl} width={480} height={480} unoptimized alt={`Código QR para ${bin.name}`} /> : <div className="qr-placeholder">Generando QR…</div>}<span className="print-category" style={{ '--bin-color': bin.color } as React.CSSProperties}><BinIcon name={bin.icon} size={20} /> {bin.name}</span><span className="print-caption">Escanea para saber cómo separar</span></div><p>Vista previa del rótulo</p></section>
      </div>
      <div className="generator-footnote">Los QR contienen únicamente el enlace a esta guía. Las imágenes generadas se procesan en tu navegador.</div>
    </main>
  );
}
