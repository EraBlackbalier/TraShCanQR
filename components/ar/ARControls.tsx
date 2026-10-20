'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ArrowLeft, CircleHelp, MousePointerClick, ZoomIn, ZoomOut } from 'lucide-react';

/**
 * Barra de controles visible sobre la cámara.
 * Agrega aquí los botones de acercar/alejar; el estado y el cambio de escala
 * pertenecen a ARScene, que puede redimensionar la tarjeta sin mover su ancla.
 */
export function ARControls({ onZoomIn, onZoomOut }: { onZoomIn: () => void; onZoomOut: () => void }) {
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
  return <div className="ar-controls"><Link className="ar-control-button" href="/"><ArrowLeft size={17} /><span>Elegir otro bote</span></Link><div className="ar-control-group">{zoomButton(onZoomOut, 'Alejar tarjeta', <ZoomOut size={17} />)}{zoomButton(onZoomIn, 'Acercar tarjeta', <ZoomIn size={17} />)}<span className="ar-control-help"><CircleHelp size={15} /> Mantén visible la etiqueta</span><span className="ar-control-help ar-card-hint"><MousePointerClick size={15} /> Presiona la tarjeta para ampliarla y leerla</span></div></div>;
}
