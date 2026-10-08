'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import Image from 'next/image';
import { Download, Printer, QrCode, ScanSearch } from 'lucide-react';
import { bins } from '@/data/bins';
import { getBinUrl } from '@/lib/qr';
import { BinIcon } from '@/components/bins/BinIcon';

export function QrGenerator() {
  const [slug, setSlug] = useState(bins[0].slug);
  const [origin, setOrigin] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const [format, setFormat] = useState<'qr' | 'label'>('qr');
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
          <label htmlFor="output-format">1. Elige el formato</label>
          <select id="output-format" value={format} onChange={(event) => setFormat(event.target.value as 'qr' | 'label')}><option value="qr">Código QR tradicional</option><option value="label">Etiqueta con marcador AR</option></select>
          <label htmlFor="bin-select">2. Elige una categoría</label>
          <select id="bin-select" value={slug} onChange={(event) => setSlug(event.target.value)}>{bins.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select>
          <label htmlFor="qr-url">3. Confirma la dirección</label>
          <input id="qr-url" value={url} readOnly aria-label="Dirección contenida en el QR" />
          <p className="form-hint">En Vercel, configura <code>NEXT_PUBLIC_SITE_URL</code> con el dominio público. En desarrollo puedes usar la dirección IP local para abrir el enlace desde tu teléfono.</p>
          <div className="generator-actions">{format === 'qr' ? <a className={`button button-primary${!dataUrl ? ' disabled' : ''}`} href={dataUrl || undefined} download={`trashcan-${slug}.png`}><Download size={18} /> Descargar PNG</a> : <a className="button button-primary" href={`/ar/labels/${slug}.png`} download={`trashcan-etiqueta-${slug}.png`}><Download size={18} /> Descargar etiqueta</a>}<button className="button button-outline" onClick={() => window.print()} disabled={format === 'qr' && !dataUrl}><Printer size={18} /> Imprimir</button></div>
        </section>
        <section className="qr-preview" aria-label={format === 'qr' ? 'Vista previa del código QR' : 'Vista previa de la etiqueta con marcador AR'}><div className={`print-card${format === 'label' ? ' label-preview' : ''}`}>{format === 'qr' ? <><div className="print-brand"><span className="brand-mark"><QrCode size={18} /></span> TraShCan<span className="brand-dot">.</span></div>{dataUrl ? <Image src={dataUrl} width={480} height={480} unoptimized alt={`Código QR para ${bin.name}`} /> : <div className="qr-placeholder">Generando QR…</div>}<span className="print-category" style={{ '--bin-color': bin.color } as React.CSSProperties}><BinIcon name={bin.icon} size={20} /> {bin.name}</span><span className="print-caption">Escanea para saber cómo separar</span></> : <Image className="ar-label-preview" src={`/ar/labels/${slug}.png`} width={1000} height={1320} unoptimized alt={`Etiqueta AR imprimible para ${bin.name}`} />}</div><p>{format === 'qr' ? 'Vista previa del rótulo QR' : <><ScanSearch size={14} /> Etiqueta reconocible por seguimiento visual MindAR</>}</p></section>
      </div>
      <div className="generator-footnote">{format === 'qr' ? 'Los QR contienen únicamente el enlace a esta guía. Las imágenes generadas se procesan en tu navegador.' : 'Imprime la etiqueta a tamaño completo y con buena iluminación. Esta misma imagen está compilada como objetivo local del seguimiento AR.'}</div>
    </main>
  );
}
