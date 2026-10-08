export type BinIcon = 'leaf' | 'bottle' | 'file' | 'glass' | 'trash' | 'zap';

export interface Bin {
  id: string;
  slug: string;
  name: string;
  description: string;
  color: string;
  icon: BinIcon;
  acceptedItems: string[];
  rejectedItems: string[];
  recommendations: string[];
  examples: string[];
}
