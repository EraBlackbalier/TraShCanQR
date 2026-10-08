import type { Metadata, Viewport } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'TraShCan | Escanea, aprende y separa', template: '%s' },
  description: 'Una guía sencilla para saber qué residuos van en cada bote. Escanea un código QR y separa mejor.',
  applicationName: 'TraShCan',
};

export const viewport: Viewport = { themeColor: '#f6f8f3', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body><SiteHeader />{children}</body></html>;
}
