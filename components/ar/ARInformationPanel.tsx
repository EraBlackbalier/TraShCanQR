'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Check, Leaf, Recycle, ShieldAlert, X } from 'lucide-react';
import type { Bin } from '@/types/bin';
import { BinIllustration } from './BinIllustration';

type PanelMode = 'accepted' | 'rejected';

/**
 * Maquetación, pestañas y transición del contenido de la tarjeta AR.
 * Para cambiar qué se acepta/rechaza edita data/bins.ts, no dupliques reglas aquí.
 * Para modificar el dibujo de una categoría edita BinIllustration.tsx.
 */
export function ARInformationPanel({ bin }: { bin: Bin }) {
  const [mode, setMode] = useState<PanelMode>('accepted');
  const [expanded, setExpanded] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef(false);
  useEffect(() => {
    if (expanded) dialogRef.current?.showModal();
    else if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      cardRef.current?.focus();
    }
  }, [expanded]);
  const closeReader = () => {
    restoreFocusRef.current = true;
    setExpanded(false);
  };
  const isAccepted = mode === 'accepted';
  const items = isAccepted ? bin.acceptedItems : bin.rejectedItems;
  const tiltCard = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch' && event.buttons === 0) return;
    const card = event.currentTarget;
    const bounds = card.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    card.style.setProperty('--card-tilt-x', `${y * -7}deg`);
    card.style.setProperty('--card-tilt-y', `${x * 9}deg`);
  };
  const resetCardTilt = (event: React.PointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty('--card-tilt-x', '0deg');
    event.currentTarget.style.setProperty('--card-tilt-y', '0deg');
  };

  const card = (
    <section className={`ar-anchor-card ar-card-${bin.icon}`} style={{ '--bin-color': bin.color } as React.CSSProperties} aria-label={`Información AR: ${bin.name}`} aria-description="Presiona Enter o Espacio para ampliar la tarjeta" aria-keyshortcuts="Enter Space" tabIndex={expanded ? -1 : 0} ref={(element) => { if (element && !element.closest('.ar-reading-dialog')) cardRef.current = element; }} onKeyDown={(event) => {
      if (!expanded && event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        setExpanded(true);
      }
    }} onPointerMove={tiltCard} onPointerLeave={resetCardTilt} onPointerCancel={resetCardTilt} onClick={(event) => {
      if (!expanded && !(event.target as HTMLElement).closest('button')) setExpanded(true);
    }}>
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
  return <>
    {card}
    {expanded && createPortal(
      <dialog ref={dialogRef} className="ar-reading-dialog" aria-label={`Lectura ampliada: ${bin.name}`} onCancel={closeReader} onClose={closeReader}>
        <button type="button" className="ar-reading-close" onClick={closeReader} autoFocus><X size={18} /> Volver a la cámara</button>
        <div className="ar-reading-scroll"><div className="ar-reading-card is-tracked">{card}</div></div>
        <p>Desliza para recorrer la tarjeta si no cabe completa.</p>
      </dialog>, document.body
    )}
  </>;
}
