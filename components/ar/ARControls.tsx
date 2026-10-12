'use client';

import Link from 'next/link';
import { ArrowLeft, CircleHelp } from 'lucide-react';

/**
 * Barra de controles visible sobre la cámara.
 * Agrega aquí los botones de acercar/alejar; el estado y el cambio de escala
 * pertenecen a ARScene, que puede redimensionar la tarjeta sin mover su ancla.
 */
export function ARControls() {
  return <div className="ar-controls"><Link className="ar-control-button" href="/"><ArrowLeft size={17} /><span>Elegir otro bote</span></Link><span className="ar-control-help"><CircleHelp size={15} /> Mantén visible la etiqueta</span></div>;
}
