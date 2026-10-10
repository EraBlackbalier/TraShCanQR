import { describe, expect, it } from 'vitest';
import { syncPanelAnchorPose } from '@/lib/ar/panel-anchor';

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
