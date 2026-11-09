'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ArrowLeft, CircleHelp, MousePointerClick, ZoomIn, ZoomOut } from 'lucide-react';

/**
 * Barra de controles visible sobre la cámara.
 * Agrega aquí los botones de acercar/alejar; el estado y el cambio de escala
 * pertenecen a ARScene, que puede redimensionar el modelo sin mover su ancla.
 */
export function ARControls({ onZoomIn, onZoomOut, onOpenDetails, canOpenDetails }: { onZoomIn: () => void; onZoomOut: () => void; onOpenDetails: (focusTarget: HTMLElement) => void; canOpenDetails: boolean }) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (repeatTimer.current) clearInterval(repeatTimer.current);
    holdTimer.current = null;
    repeatTimer.current = null;
  };
  // Evitar que los intervalos sigan ejecutándose cuando se abandona la vista AR.
  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (repeatTimer.current) clearInterval(repeatTimer.current);
  }, []);
  const startHold = (action: () => void) => {
    stopHold();
    holdTimer.current = setTimeout(() => {
      repeatTimer.current = setInterval(action, 70);
    }, 260);
  };
  const zoomButton = (action: () => void, label: string, icon: React.ReactNode) => <button type="button" className="ar-zoom-button" onClick={action} onPointerDown={() => startHold(action)} onPointerUp={stopHold} onPointerLeave={stopHold} onPointerCancel={stopHold} aria-label={label}>{icon}</button>;
  return <div className="ar-controls"><Link className="ar-control-button" href="/"><ArrowLeft size={17} /><span>Elegir otro bote</span></Link><div className="ar-control-group">{zoomButton(onZoomOut, 'Alejar modelo', <ZoomOut size={17} />)}{zoomButton(onZoomIn, 'Acercar modelo', <ZoomIn size={17} />)}<span className="ar-control-help"><CircleHelp size={15} /> Mantén visible la etiqueta</span><button type="button" className="ar-control-help ar-card-hint" onClick={(event) => onOpenDetails(event.currentTarget)} disabled={!canOpenDetails}><MousePointerClick size={15} /><span>Averiguar más info</span></button></div></div>;
}
