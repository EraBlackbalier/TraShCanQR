import type { Metadata } from 'next';
import { QrGenerator } from '@/components/qr/QrGenerator';

export const metadata: Metadata = { title: 'Generar códigos QR | TraShCan', description: 'Crea e imprime códigos QR para las categorías de TraShCan.' };

export default function GenerateQrPage() {
  return <QrGenerator />;
}
