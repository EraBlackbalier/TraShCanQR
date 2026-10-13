interface MatrixLike {
  copy(source: MatrixLike): unknown;
}

/** Copy the latest MindAR CSS anchor pose; keep the last valid pose through brief tracking loss. */
export function syncPanelAnchorPose(panelMatrix: MatrixLike, markerMatrix: MatrixLike, tracked: boolean): boolean {
  if (!tracked) return false;
  panelMatrix.copy(markerMatrix);
  return true;
}

/** Keep a card below 84% of viewport width and 44% of height; never enlarge distant targets. */
export function fitPanelToViewport(widthFraction: number, heightFraction: number, baseScale: number): number {
  if (!Number.isFinite(widthFraction) || !Number.isFinite(heightFraction) || widthFraction <= 0 || heightFraction <= 0) return baseScale;
  return baseScale * Math.min(1, .84 / widthFraction, .44 / heightFraction);
}

/** Keep the complete 600 by 300 card upright, readable and inside the camera view. */
export function getReadablePanelLayout(width: number, height: number, x: number, y: number) {
  const margin = 16;
  const top = Math.min(72, height * .15);
  const bottom = Math.min(138, height * .25);
  const availableWidth = Math.max(1, width - margin * 2);
  const availableHeight = Math.max(1, height - top - bottom);
  const cardWidth = Math.min(Math.max(600, width * .56), 900, availableWidth, availableHeight * 2);
  const cardHeight = cardWidth / 2;
  return {
    scale: cardWidth / 600,
    left: Math.max(margin, Math.min(x - cardWidth / 2, width - margin - cardWidth)),
    top: Math.max(top, Math.min(y - cardHeight / 2, height - bottom - cardHeight)),
  };
}
