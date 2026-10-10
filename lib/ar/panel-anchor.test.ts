import { describe, expect, it } from 'vitest';
import { fitPanelToViewport, syncPanelAnchorPose } from '@/lib/ar/panel-anchor';

class TestMatrix {
  values: number[];
  constructor(...values: number[]) { this.values = values; }
  copy(source: TestMatrix) { this.values = [...source.values]; return this; }
}

describe('pose del panel CSS3D', () => {
  it('sigue la matriz del marcador y congela la última pose mientras se recupera', () => {
    const panel = new TestMatrix(0, 0, 0);
    const marker = new TestMatrix(1, 2, 3);
    expect(syncPanelAnchorPose(panel, marker, true)).toBe(true);
    expect(panel.values).toEqual([1, 2, 3]);
    marker.values = [8, 9, 10];
    expect(syncPanelAnchorPose(panel, marker, false)).toBe(false);
    expect(panel.values).toEqual([1, 2, 3]);
    expect(syncPanelAnchorPose(panel, marker, true)).toBe(true);
    expect(panel.values).toEqual([8, 9, 10]);
  });
});

describe('tamaño de la tarjeta frente al QR', () => {
  it('conserva la escala del marcador a distancia sin agrandar artificialmente la tarjeta', () => {
    expect(fitPanelToViewport(.2, .1, .82)).toBe(.82);
  });
  it('reduce una tarjeta cercana para dejar visible la cámara', () => {
    const scale = fitPanelToViewport(.95, .65, .82);
    expect(.95 * scale / .82).toBeLessThanOrEqual(.72);
    expect(.65 * scale / .82).toBeLessThanOrEqual(.36);
    expect(scale).toBeLessThan(.82);
  });
  it('descarta proyecciones inválidas sin introducir NaN en la escena', () => {
    expect(fitPanelToViewport(NaN, .2, .82)).toBe(.82);
    expect(fitPanelToViewport(0, .2, .82)).toBe(.82);
  });
});
