import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Bin } from '@/types/bin';
import { BinIcon } from './BinIcon';

export function BinCard({ bin, index = 0 }: { bin: Bin; index?: number }) {
  return (
    <Link href={`/bote/${bin.slug}`} className="bin-card" style={{ '--bin-color': bin.color, animationDelay: `${index * 55}ms` } as React.CSSProperties}>
      <span className="bin-icon"><BinIcon name={bin.icon} size={27} /></span>
      <span className="bin-card-copy"><strong>{bin.name}</strong><span>{bin.description}</span></span>
      <ArrowUpRight className="bin-card-arrow" size={19} aria-hidden="true" />
    </Link>
  );
}
