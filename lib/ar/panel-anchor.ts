interface MatrixLike {
  copy(source: MatrixLike): unknown;
}

/** Copy the latest MindAR CSS anchor pose; keep the last valid pose through brief tracking loss. */
export function syncPanelAnchorPose(panelMatrix: MatrixLike, markerMatrix: MatrixLike, tracked: boolean): boolean {
  if (!tracked) return false;
  panelMatrix.copy(markerMatrix);
  return true;
}
