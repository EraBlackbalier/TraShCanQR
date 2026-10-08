'use client';

import Link from 'next/link';
import { ArrowLeft, CircleHelp } from 'lucide-react';

export function ARControls({ slug }: { slug: string }) {
  return <div className="ar-controls"><Link className="ar-control-button" href={`/bote/${slug}`}><ArrowLeft size={17} /><span>Ficha del bote</span></Link><span className="ar-control-help"><CircleHelp size={15} /> Mantén visible la etiqueta</span></div>;
}
