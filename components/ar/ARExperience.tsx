'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Camera, Leaf } from 'lucide-react';

const ARScene = dynamic(() => import('./ARScene').then((module) => module.ARScene), {
  ssr: false,
  loading: () => <div className="ar-loading-screen" role="status">Preparando recursos locales de realidad aumentada…</div>,
});

export function ARExperience({ name }: { name: string }) {
  const [active, setActive] = useState(false);
  if (active) return <ARScene onExit={() => setActive(false)} />;

  return (
    <main className="ar-entry">
      <div className="ar-entry-card">
        <span className="ar-entry-icon"><Leaf size={34} /></span>
        <span className="eyebrow">EXPERIENCIA WEBAR · {name.toLocaleUpperCase('es')}</span>
        <h1>Descubre esta etiqueta en realidad aumentada</h1>
        <p>Al activar la cámara, apunta a la etiqueta TraShCan de esta categoría. El contenido solo aparecerá al reconocerla y permanecerá vinculado al marcador mientras sea visible.</p>
        <button className="button button-primary button-large" onClick={() => setActive(true)}><Camera size={19} /> Ver en realidad aumentada</button>
        <small>El video se procesa en este dispositivo y no se envía a ningún servidor.</small>
      </div>
    </main>
  );
}
