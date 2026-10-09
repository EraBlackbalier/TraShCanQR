import { bins, getBinBySlug } from '@/data/bins';

/** El orden se conserva al compilar public/ar/targets/trashcan-labels.mind. */
export const markerTargets = bins.map((bin, targetIndex) => ({
  targetIndex,
  slug: bin.slug,
  image: `/ar/labels/${bin.slug}.png`,
}));

/** Geometría de scripts/generate-ar-labels.mjs, en píxeles de la imagen objetivo. */
export const markerLabelGeometry = {
  width: 1000,
  height: 1320,
  qrCardTop: 800,
  panelWidth: 600,
  panelHeight: 300,
  panelScale: 1.15,
  panelGap: 18,
  panelDepth: 0.025,
} as const;

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

export function getMarkerBin(targetIndex: number) {
  const target = markerTargets.find((item) => item.targetIndex === targetIndex);
  return target ? getBinBySlug(target.slug) : undefined;
}
