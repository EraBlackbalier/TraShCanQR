interface MatrixLike {
  copy(source: MatrixLike): unknown;
}

/** Copy the latest MindAR CSS anchor pose; keep the last valid pose through brief tracking loss. */
export function syncPanelAnchorPose(panelMatrix: MatrixLike, markerMatrix: MatrixLike, tracked: boolean): boolean {
  if (!tracked) return false;
  panelMatrix.copy(markerMatrix);
  return true;
}

/** Keep a card below 72% of viewport width and 36% of height; never enlarge distant targets. */
export function fitPanelToViewport(widthFraction: number, heightFraction: number, baseScale: number): number {
  if (!Number.isFinite(widthFraction) || !Number.isFinite(heightFraction) || widthFraction <= 0 || heightFraction <= 0) return baseScale;
  return baseScale * Math.min(1, .72 / widthFraction, .36 / heightFraction);
}
