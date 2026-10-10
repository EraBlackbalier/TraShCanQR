import { Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { getMarkerCSSPanelPose, getMarkerQRPoint, markerLabelGeometry } from '@/lib/ar/marker-config';
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
    expect(.95 * scale / .82).toBeLessThanOrEqual(.84);
    expect(.65 * scale / .82).toBeLessThanOrEqual(.44);
    expect(scale).toBeLessThan(.82);
  });
  it('descarta proyecciones inválidas sin introducir NaN en la escena', () => {
    expect(fitPanelToViewport(NaN, .2, .82)).toBe(.82);
    expect(fitPanelToViewport(0, .2, .82)).toBe(.82);
  });
});

describe('proyección espacial del QR', () => {
  const camera = new PerspectiveCamera(50, 390 / 844, .01, 100);
  const cssScale = new Matrix4().makeScale(.001, .001, .001);
  const qr = getMarkerQRPoint();

  it('proyecta el mismo punto desde el ancla CSS y el marcador 3D al trasladar y girar la etiqueta', () => {
    for (const distance of [2, 4, 8]) {
      for (const angle of [-.3, 0, .3]) {
        const pose = new Matrix4().compose(new Vector3(.15, -.1, -distance), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), angle), new Vector3(1, 1, 1));
        const expected = new Vector3(qr.x, qr.y, qr.z).applyMatrix4(pose).project(camera);
        const cssPose = pose.clone().multiply(cssScale);
        const actual = new Vector3(qr.x * 1000, qr.y * 1000, 0).applyMatrix4(cssPose).project(camera);
        expect(actual.distanceTo(expected)).toBeLessThan(1e-10);
      }
    }
  });

  it('crece al acercar el marcador sin añadir una distancia virtual distinta', () => {
    const panel = getMarkerCSSPanelPose();
    const projectedWidth = (distance: number) => {
      const matrix = new Matrix4().makeTranslation(0, 0, -distance).multiply(cssScale);
      const halfWidth = markerLabelGeometry.panelWidth * markerLabelGeometry.panelScale / 2;
      const left = new Vector3(panel.x - halfWidth, panel.y, panel.z).applyMatrix4(matrix).project(camera);
      const right = new Vector3(panel.x + halfWidth, panel.y, panel.z).applyMatrix4(matrix).project(camera);
      return right.x - left.x;
    };
    const near = projectedWidth(3);
    const far = projectedWidth(6);
    expect(near / far).toBeCloseTo(2, 2);
    expect(panel.z * .001).toBeLessThan(.005);
  });
});
