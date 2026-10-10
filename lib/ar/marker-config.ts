import { bins, getBinById } from '@/data/bins';
import { markerLabelGeometry } from '@/lib/ar/label-geometry';

/** El orden se conserva al compilar public/ar/targets/trashcan-labels.mind. */
export const markerTargets = bins.map((bin, targetIndex) => ({
  targetId: bin.id,
  targetIndex,
  slug: bin.slug,
  image: `/ar/labels/${bin.slug}.png`,
}));

/** Geometría importada de la misma fuente que usan el generador y el target impreso. */
export { markerLabelGeometry };

/** CSS3D de MindAR usa 1 CSS px = 0.001 unidades del marcador (ancho = 1). */
export function getMarkerPanelPose() {
  const { width, height, qrCardTop, panelHeight, panelGap, panelDepth, panelScale } = markerLabelGeometry;
  const scaledPanelHeight = panelHeight * panelScale;
  const panelCenterY = qrCardTop - panelGap - scaledPanelHeight / 2;
  return {
    x: 0,
    y: (height / 2 - panelCenterY) / width,
    z: panelDepth,
  };
}

export function getMarkerTargetIndex(slug: string): number | undefined {
  return markerTargets.find((target) => target.slug === slug)?.targetIndex;
}

export function getMarkerTarget(slug: string) {
  return markerTargets.find((target) => target.slug === slug);
}

export function getMarkerBin(targetIndex: number) {
  const target = markerTargets.find((item) => item.targetIndex === targetIndex);
  return target ? getBinById(target.targetId) : undefined;
}
