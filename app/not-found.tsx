import Link from 'next/link';
import { ArrowLeft, SearchX } from 'lucide-react';

export default function NotFound() {
  return <main className="not-found"><span className="not-found-icon"><SearchX size={34} /></span><span className="eyebrow">CATEGORÍA NO DISPONIBLE</span><h1>No encontramos ese bote</h1><p>Puede que el enlace esté incompleto o que la categoría ya no esté disponible.</p><Link href="/" className="button button-primary"><ArrowLeft size={17} /> Volver al inicio</Link></main>;
}
