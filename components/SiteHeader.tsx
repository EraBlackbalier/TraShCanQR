import Link from 'next/link';
import { Recycle } from 'lucide-react';

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="TraShCan, página de inicio">
        <span className="brand-mark"><Recycle size={22} strokeWidth={2.4} /></span>
        <span>TraShCan<span className="brand-dot">.</span></span>
      </Link>
      <nav aria-label="Navegación principal">
        <Link href="/generar-qr">Generar QR</Link>
      </nav>
    </header>
  );
}
