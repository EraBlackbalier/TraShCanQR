'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, QrCode, ScanLine, Sparkles, ScanSearch } from 'lucide-react';
import { bins } from '@/data/bins';
import { BinCard } from '@/components/bins/BinCard';
import { Scanner } from '@/components/scanner/Scanner';

export default function HomePage() {
  const [scannerOpen, setScannerOpen] = useState(false);

  return (
    <main>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={14} /> SEPARAR BIEN EMPIEZA AQUÍ</span>
          <h1>Escanea, aprende<br />y <span>separa mejor.</span></h1>
          <p>Apunta a la etiqueta física y descubre los residuos permitidos con realidad aumentada anclada al marcador.</p>
          <div className="hero-actions hero-quick-actions">
            <Link href="/generar-qr" className="button button-primary button-large hero-quick-action"><QrCode size={22} /> Generar QR</Link>
            <button type="button" className="button button-outline button-large hero-quick-action" onClick={() => setScannerOpen(true)}><ScanLine size={22} /> Escanear QR</button>
          </div>
          <div className="hero-footnote"><span className="live-dot" /> Fácil, rápido y sin instalar nada</div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-sun" /><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-leaf leaf-one">✳</div><div className="art-leaf leaf-two">✦</div>
          <div className="phone-card"><div className="phone-camera" /><div className="phone-screen"><span className="phone-label">BOTE IDENTIFICADO</span><div className="phone-bin"><span>♻</span></div><strong>Orgánicos</strong><span className="phone-status"><i /> Categoría correcta</span><div className="phone-lines"><i /><i /><i /></div></div></div>
          <div className="art-caption"><span>01</span><i /> Una decisión consciente</div>
        </div>
      </section>
      <section className="categories-section" id="categorias">
        <div className="section-heading"><div><span className="eyebrow">GUÍA DE SEPARACIÓN</span><h2>Explorar tipos de residuos</h2><p>Encuentra una categoría y conoce las recomendaciones para separar mejor.</p></div><span className="category-count">{String(bins.length).padStart(2, '0')} categorías</span></div>
        <div className="bin-grid">{bins.map((bin, index) => <BinCard key={bin.id} bin={bin} index={index} />)}</div>
      </section>
      <section className="ar-home-card"><span className="ar-home-symbol"><ScanSearch size={27} /></span><div><span className="eyebrow">UNA GUÍA QUE SIGUE LA ETIQUETA</span><h2>Apunta y aprende en realidad aumentada</h2><p>Selecciona el tipo de bote, activa la cámara y apunta a su etiqueta impresa. Solo aparecerá el contenido de esa categoría.</p></div><Link href="/ar/bote/organicos" className="button button-outline">Probar experiencia AR <ArrowRight size={17} /></Link></section>
      <section className="home-bottom"><span className="bottom-icon"><ScanLine size={19} /></span><p>¿Tienes un bote enfrente?</p><Link href="/generar-qr">Imprimir etiquetas AR <ArrowRight size={16} /></Link></section>
      <footer className="site-footer"><span>TraShCan<span className="brand-dot">.</span></span><span>Aprender a separar también cuenta.</span><span>© {new Date().getFullYear()} TraShCan</span></footer>
      {scannerOpen && <Scanner onClose={() => setScannerOpen(false)} />}
    </main>
  );
}
