import { notFound } from 'next/navigation';
import { BinDetails } from '@/components/bins/BinDetails';
import { bins, getBinBySlug } from '@/data/bins';

export function generateStaticParams() {
  return bins.map((bin) => ({ slug: bin.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bin = getBinBySlug(slug);
  return { title: bin ? `${bin.name} | TraShCan` : 'Bote no encontrado | TraShCan', description: bin?.description ?? 'No encontramos esta categoría de residuos.' };
}

export default async function BinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bin = getBinBySlug(slug);
  if (!bin) notFound();
  return <main className="detail-page"><BinDetails bin={bin} /></main>;
}
