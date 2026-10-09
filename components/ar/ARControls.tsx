'use client';

import Link from 'next/link';
import { ArrowLeft, CircleHelp } from 'lucide-react';

export function ARControls() {
  return <div className="ar-controls"><Link className="ar-control-button" href="/"><ArrowLeft size={17} /><span>Elegir otro bote</span></Link><span className="ar-control-help"><CircleHelp size={15} /> Mantén visible la etiqueta</span></div>;
}
