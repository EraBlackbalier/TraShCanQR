import { describe, expect, it } from 'vitest';
import { getReadablePanelLayout } from './panel-anchor';

describe('readable marker card', () => {
  it.each([[1366, 768], [390, 844], [844, 390], [320, 568]])('fits the complete card within %s by %s', (width, height) => {
    for (const x of [-1000, width / 2, width + 1000]) {
      for (const y of [-1000, height / 2, height + 1000]) {
        const layout = getReadablePanelLayout(width, height, x, y);
        expect(layout.left).toBeGreaterThanOrEqual(16);
        expect(layout.top).toBeGreaterThanOrEqual(0);
        expect(layout.left + 600 * layout.scale).toBeLessThanOrEqual(width - 16);
        expect(layout.top + 300 * layout.scale).toBeLessThanOrEqual(height);
      }
    }
  });
  it('keeps a readable size regardless of marker position', () => {
    expect(getReadablePanelLayout(1366, 768, 100, 100).scale).toBeGreaterThanOrEqual(1);
    expect(getReadablePanelLayout(1366, 768, 100, 100).scale).toBe(getReadablePanelLayout(1366, 768, 900, 600).scale);
  });
});
