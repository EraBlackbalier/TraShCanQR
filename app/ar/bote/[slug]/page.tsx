import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ARExperience } from '@/components/ar/ARExperience';
import { bins, getBinBySlug } from '@/data/bins';

export function generateStaticParams() {
  return bins.map((bin) => ({ slug: bin.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const bin = getBinBySlug(slug);
  return {
    title: bin ? `${bin.name} en realidad aumentada | TraShCan` : 'Bote no encontrado | TraShCan',
    description: bin ? `Sigue la etiqueta impresa de ${bin.name} y consulta la guía de separación anclada a ella.` : 'No encontramos esta categoría de residuos.',
  };
}

export default async function ARBinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bin = getBinBySlug(slug);
  if (!bin) notFound();
  return <ARExperience name={bin.name} />;
}
