'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ScanLine, Sparkles, ScanSearch } from 'lucide-react';
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
          <p>Descubre en segundos qué va en cada bote. Pequeños gestos hacen una gran diferencia.</p>
          <div className="hero-actions">
            <button id="escanear" className="button button-primary button-large" onClick={() => setScannerOpen(true)}><ScanLine size={20} /> Escanear código QR</button>
            <a className="text-link" href="#categorias">Explorar categorías <ArrowDown size={16} /></a>
          </div>
          <div className="hero-footnote"><span className="live-dot" /> Fácil, rápido y sin instalar nada</div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-sun" /><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-leaf leaf-one">✳</div><div className="art-leaf leaf-two">✦</div>
          <div className="phone-card"><div className="phone-camera" /><div className="phone-screen"><span className="phone-label">BOT E IDENTIFICADO</span><div className="phone-bin"><span>♻</span></div><strong>Orgánicos</strong><span className="phone-status"><i /> Categoría correcta</span><div className="phone-lines"><i /><i /><i /></div></div></div>
          <div className="art-caption"><span>01</span><i /> Una decisión consciente</div>
        </div>
      </section>
      <section className="categories-section" id="categorias">
        <div className="section-heading"><div><span className="eyebrow">GUÍA DE SEPARACIÓN</span><h2>Explorar tipos de residuos</h2><p>Encuentra una categoría y conoce las recomendaciones para separar mejor.</p></div><span className="category-count">{String(bins.length).padStart(2, '0')} categorías</span></div>
        <div className="bin-grid">{bins.map((bin, index) => <BinCard key={bin.id} bin={bin} index={index} />)}</div>
      </section>
      <section className="ar-home-card"><span className="ar-home-symbol"><ScanSearch size={27} /></span><div><span className="eyebrow">UNA GUÍA QUE SIGUE LA ETIQUETA</span><h2>Apunta y aprende en realidad aumentada</h2><p>Abre la ficha de un bote y activa la cámara para ver la información anclada a una etiqueta TraShCan impresa.</p></div><Link href="/ar/bote/organicos" className="button button-outline">Probar experiencia AR <ArrowRight size={17} /></Link></section>
      <section className="home-bottom"><span className="bottom-icon"><ScanLine size={19} /></span><p>¿Tienes un bote enfrente?</p><button onClick={() => setScannerOpen(true)}>Escanéalo ahora <ArrowRight size={16} /></button></section>
      <footer className="site-footer"><span>TraShCan<span className="brand-dot">.</span></span><span>Aprender a separar también cuenta.</span><span>© {new Date().getFullYear()} TraShCan</span></footer>
      {scannerOpen && <Scanner onClose={() => setScannerOpen(false)} />}
    </main>
  );
}
