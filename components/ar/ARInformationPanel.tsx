'use client';

import { useState } from 'react';
import { ArrowUpRight, Check, Leaf, Recycle, ShieldAlert, X } from 'lucide-react';
import type { Bin } from '@/types/bin';
import { BinIllustration } from './BinIllustration';

type PanelMode = 'accepted' | 'rejected';

export function ARInformationPanel({ bin }: { bin: Bin }) {
  const [mode, setMode] = useState<PanelMode>('accepted');
  const isAccepted = mode === 'accepted';
  const items = isAccepted ? bin.acceptedItems : bin.rejectedItems;

  return (
    <section className={`ar-anchor-card ar-card-${bin.icon}`} style={{ '--bin-color': bin.color } as React.CSSProperties} aria-label={`Información AR: ${bin.name}`}>
      <header className="ar-card-topline">
        <span className="ar-card-brand"><span className="ar-brand-mark"><Recycle size={15} /></span> TRASHCAN <i /> GUÍA DE SEPARACIÓN</span>
        <span className="ar-card-category"><span /> {bin.icon === 'zap' ? 'RECUPERACIÓN ESPECIAL' : 'RECICLAJE CONSCIENTE'}</span>
      </header>
      <div className="ar-card-layout">
        <div className="ar-card-art-stage" aria-hidden="false"><BinIllustration kind={bin.icon} /><span className="ar-art-caption"><Leaf size={11} /> CIRCULARIDAD EN ACCIÓN</span></div>
        <div className="ar-card-copy">
          <div className="ar-card-title"><span className="ar-card-kicker">IDENTIFICADO</span><h2>{bin.name}</h2></div>
          <p className="ar-card-description">{bin.description}</p>
          <div className="ar-card-tabs" role="tablist" aria-label="Guía de separación">
            <button type="button" role="tab" aria-selected={isAccepted} className={isAccepted ? 'selected accepted' : ''} onClick={() => setMode('accepted')}><Check size={13} /> SÍ PUEDES</button>
            <button type="button" role="tab" aria-selected={!isAccepted} className={!isAccepted ? 'selected rejected' : ''} onClick={() => setMode('rejected')}><X size={13} /> EVITA</button>
          </div>
          <div className={`ar-card-list-shell ${mode}`} key={mode}>
            <div className="ar-card-list-label">{isAccepted ? <Check size={13} /> : <ShieldAlert size={13} />}<strong>{isAccepted ? 'SÍ PUEDES DEPOSITAR' : 'NO DEPOSITES'}</strong><ArrowUpRight size={13} /></div>
            <ul className={`ar-anchor-items ${mode}`}>
              {items.slice(0, 3).map((item) => <li key={item}><span>{isAccepted ? <Check size={12} /> : <X size={12} />}</span>{item}</li>)}
            </ul>
          </div>
        </div>
      </div>
      <footer className="ar-card-footer"><span><i className="ar-live-dot" /> MARCADOR VINCULADO</span><span>Reglas orientativas · verifica tu servicio local</span></footer>
    </section>
  );
}
