import { describe, expect, it } from 'vitest';
import { AR_PANEL_DEFAULT_SCALE, AR_PANEL_MAX_SCALE, AR_PANEL_MIN_SCALE, clampARPanelScale } from '@/lib/ar/panel-scale';

describe('panel de realidad aumentada', () => {
  it('usa una escala aumentada por defecto para resultar visible', () => {
    expect(AR_PANEL_DEFAULT_SCALE).toBe(4);
  });
  it('permite cambiar de tamaño sin superar los límites seguros', () => {
    expect(clampARPanelScale(4.6)).toBe(4.6);
    expect(clampARPanelScale(100)).toBe(AR_PANEL_MAX_SCALE);
    expect(clampARPanelScale(-1)).toBe(AR_PANEL_MIN_SCALE);
    expect(clampARPanelScale(Number.NaN)).toBe(AR_PANEL_DEFAULT_SCALE);
  });
});
