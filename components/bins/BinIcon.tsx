import { FileText, GlassWater, Leaf, Recycle, Trash2, Zap } from 'lucide-react';
import type { BinIcon as BinIconName } from '@/types/bin';

const icons = { leaf: Leaf, bottle: Recycle, file: FileText, glass: GlassWater, trash: Trash2, zap: Zap };

export function BinIcon({ name, size = 28, className }: { name: BinIconName; size?: number; className?: string }) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" size={size} strokeWidth={1.8} className={className} />;
}
