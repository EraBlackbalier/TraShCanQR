/** MindAR scales the CSS target anchor by 0.001; use an enlarged world-space panel. */
export const AR_PANEL_DEFAULT_SCALE = 4;
export const AR_PANEL_MIN_SCALE = 2.2;
export const AR_PANEL_MAX_SCALE = 6.4;

export function clampARPanelScale(value: number): number {
  if (!Number.isFinite(value)) return AR_PANEL_DEFAULT_SCALE;
  return Math.min(AR_PANEL_MAX_SCALE, Math.max(AR_PANEL_MIN_SCALE, Math.round(value * 10) / 10));
}
