'use client';

import Link from 'next/link';
import { ArrowLeft, Camera, RotateCw } from 'lucide-react';
import type { ARStatus } from './ARTrackingStatus';

const message: Partial<Record<ARStatus, string>> = {
  denied: 'Para seguir la etiqueta, permite el acceso a la cámara en los ajustes del navegador. La ficha normal sigue disponible.',
  unsupported: 'No encontramos una cámara utilizable. Puedes consultar la separación en la ficha del bote.',
  error: 'La cámara o el seguimiento no se pudieron iniciar. Comprueba que el sitio esté en HTTPS y vuelve a intentarlo.',
};

export function ARFallback({ status, slug, onRetry }: { status: ARStatus; slug: string; onRetry: () => void }) {
  return <div className="ar-fallback" role="alert"><span className="ar-fallback-icon"><Camera size={28} /></span><span className="eyebrow">REALIDAD AUMENTADA</span><h1>No pudimos activar el seguimiento</h1><p>{message[status] ?? 'La cámara no está disponible en este momento.'}</p><div className="ar-fallback-actions"><button className="button button-primary" onClick={onRetry}><RotateCw size={17} /> Intentar de nuevo</button><Link href={`/bote/${slug}`} className="button button-outline"><ArrowLeft size={17} /> Ver ficha tradicional</Link></div><p className="ar-fallback-note">La función AR necesita HTTPS, permiso de cámara y un navegador móvil compatible.</p></div>;
}
