'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Camera, Leaf } from 'lucide-react';
import Link from 'next/link';

const ARScene = dynamic(() => import('./ARScene').then((module) => module.ARScene), {
  ssr: false,
  loading: () => <div className="ar-loading-screen" role="status">Preparando recursos locales de realidad aumentada…</div>,
});

export function ARExperience({ slug, name }: { slug: string; name: string }) {
  const [active, setActive] = useState(false);
  if (active) return <ARScene slug={slug} onExit={() => setActive(false)} />;

  return (
    <main className="ar-entry">
      <div className="ar-entry-card">
        <span className="ar-entry-icon"><Leaf size={34} /></span>
        <span className="eyebrow">EXPERIENCIA WEBAR · {name.toLocaleUpperCase('es')}</span>
        <h1>Descubre esta etiqueta en realidad aumentada</h1>
        <p>Al activar la cámara, busca una etiqueta TraShCan impresa. La información seguirá su posición mientras mueves el teléfono.</p>
        <button className="button button-primary button-large" onClick={() => setActive(true)}><Camera size={19} /> Ver en realidad aumentada</button>
        <Link className="text-link" href={`/bote/${slug}`}>Consultar ficha sin cámara</Link>
        <small>El video se procesa en este dispositivo y no se envía a ningún servidor.</small>
      </div>
    </main>
  );
}
