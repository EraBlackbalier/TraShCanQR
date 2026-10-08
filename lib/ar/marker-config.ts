import { bins, getBinBySlug } from '@/data/bins';

/** El orden se conserva al compilar public/ar/targets/trashcan-labels.mind. */
export const markerTargets = bins.map((bin, targetIndex) => ({
  targetIndex,
  slug: bin.slug,
  image: `/ar/labels/${bin.slug}.png`,
}));

export function getMarkerTargetIndex(slug: string): number | undefined {
  return markerTargets.find((target) => target.slug === slug)?.targetIndex;
}

export function getMarkerBin(targetIndex: number) {
  const target = markerTargets.find((item) => item.targetIndex === targetIndex);
  return target ? getBinBySlug(target.slug) : undefined;
}
