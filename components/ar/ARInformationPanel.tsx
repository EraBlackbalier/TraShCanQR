'use client';

import { useState } from 'react';
import { Check, Leaf, Recycle, X } from 'lucide-react';
import type { Bin } from '@/types/bin';

export function ARInformationPanel({ bin, visible }: { bin: Bin; visible: boolean }) {
  const [mode, setMode] = useState<'accepted' | 'rejected'>('accepted');
  const items = mode === 'accepted' ? bin.acceptedItems : bin.rejectedItems;
  return (
    <section className={`ar-anchor-card${visible ? ' is-active' : ''}`} style={{ '--bin-color': bin.color } as React.CSSProperties} aria-label={`Información AR: ${bin.name}`}>
      <header className="ar-anchor-heading"><span className="ar-anchor-icon"><Recycle size={25} /></span><span><small>TRASHCAN · GUÍA DE SEPARACIÓN</small><strong>{bin.name}</strong></span></header>
      <div className="ar-anchor-tabs" role="tablist" aria-label="Tipo de residuo">
        <button type="button" role="tab" aria-selected={mode === 'accepted'} className={mode === 'accepted' ? 'selected accepted' : ''} onClick={() => setMode('accepted')}><Check size={15} /> Sí puedes</button>
        <button type="button" role="tab" aria-selected={mode === 'rejected'} className={mode === 'rejected' ? 'selected rejected' : ''} onClick={() => setMode('rejected')}><X size={15} /> No puedes</button>
      </div>
      <ul key={mode} className={`ar-anchor-items ${mode}`}>
        {items.slice(0, 4).map((item) => <li key={item}><span>{mode === 'accepted' ? <Check size={12} /> : <X size={12} />}</span>{item}</li>)}
      </ul>
      <footer className="ar-anchor-foot"><Leaf size={13} /> Reglas orientativas · Consulta tu recolección local</footer>
    </section>
  );
}
