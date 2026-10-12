import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { bins } from '@/data/bins';
import { getMarkerBin, getMarkerCSSPanelPose, getMarkerQRPoint, getMarkerPanelPose, getMarkerTarget, getMarkerTargetIndex, markerLabelGeometry, markerTargets } from '@/lib/ar/marker-config';
import { finishMarkerPanelExit, initialMarkerTrackingState, isCurrentARSession, nextMarkerPanelPhase, reduceMarkerTracking } from '@/lib/ar/tracking';

describe('marcadores TraShCan', () => {
  it('mapea explícitamente y sin duplicados las seis etiquetas al catálogo', () => {
    expect(markerTargets.map(({ slug }) => slug)).toEqual(bins.map(({ slug }) => slug));
    expect(new Set(markerTargets.map(({ targetIndex }) => targetIndex)).size).toBe(6);
    expect(new Set(markerTargets.map(({ targetId }) => targetId)).size).toBe(6);
    expect(getMarkerTargetIndex('vidrio')).toBe(3);
    expect(getMarkerTarget('vidrio')?.targetId).toBe('bin-vidrio');
    expect(getMarkerTarget('vidrio')?.image).toBe('/ar/labels/vidrio.png');
    expect(getMarkerBin(3)?.slug).toBe('vidrio');
    expect(getMarkerBin(99)).toBeUndefined();
  });

  it('versiona una ilustración, QR y recurso compilado por cada target', () => {
    for (const target of markerTargets) {
      const svgPath = path.join(process.cwd(), 'public', 'ar', 'labels', `${target.slug}.svg`);
      const pngPath = path.join(process.cwd(), 'public', 'ar', 'labels', `${target.slug}.png`);
      const svg = readFileSync(svgPath, 'utf8');
      const png = readFileSync(pngPath);
      expect(svg).toContain(`/bote/${target.slug}`);
      expect(svg).toContain(`Etiqueta impresa para`);
      expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(png.readUInt32BE(16)).toBe(markerLabelGeometry.width);
      expect(png.readUInt32BE(20)).toBe(markerLabelGeometry.height);
    }
    const mindPath = path.join(process.cwd(), 'public', 'ar', 'targets', 'trashcan-labels.mind');
    const pdf = readFileSync(path.join(process.cwd(), 'public', 'ar', 'labels', 'hoja-etiquetas.pdf'));
    expect(statSync(mindPath).size).toBeGreaterThan(10_000);
    expect(pdf.subarray(0, 8).toString()).toBe('%PDF-1.4');
    expect(pdf.toString('latin1')).toContain('/Count 1');
    expect(pdf.toString('latin1')).toContain('/Label5');
  });

  it('alinea el borde inferior del panel encima del QR según la geometría impresa', () => {
    const pose = getMarkerPanelPose();
    const panelBottomInImagePixels = markerLabelGeometry.height / 2 - pose.y * markerLabelGeometry.width + markerLabelGeometry.panelHeight * markerLabelGeometry.panelScale / 2;
    expect(panelBottomInImagePixels).toBeCloseTo(markerLabelGeometry.qrY - markerLabelGeometry.panelGap, 8);
    expect(pose.x).toBe(0);
    expect(pose.z).toBeGreaterThan(0);
  });

  it('convierte la pose a píxeles CSS sin perder la relación espacial con el QR', () => {
    const pose = getMarkerPanelPose();
    const css = getMarkerCSSPanelPose();
    expect(css.y * .001).toBeCloseTo(pose.y);
    expect(css.z * .001).toBeCloseTo(pose.z);
    expect(markerLabelGeometry.panelWidth * markerLabelGeometry.panelScale / markerLabelGeometry.qrSize).toBeLessThan(1.9);
  });

  it('oculta la tarjeta anterior inmediatamente al activar otra categoría', () => {
    expect(nextMarkerPanelPhase('tracked', false, true)).toBe('hidden');
    expect(nextMarkerPanelPhase('leaving', false, true)).toBe('hidden');
    expect(nextMarkerPanelPhase('hidden', true, true)).toBe('tracked');
  });

  it('ubica el punto en el centro del QR, no en el centro de la etiqueta', () => {
    const point = getMarkerQRPoint();
    expect(point.x * markerLabelGeometry.width + markerLabelGeometry.width / 2).toBe(markerLabelGeometry.qrX + markerLabelGeometry.qrSize / 2);
    expect(markerLabelGeometry.height / 2 - point.y * markerLabelGeometry.width).toBe(markerLabelGeometry.qrY + markerLabelGeometry.qrSize / 2);
    expect(point.y).not.toBe(0);
    expect(point.z).toBe(0);
  });

  it('mantiene un marcador activo y recupera otro al perder seguimiento', () => {
    let state = reduceMarkerTracking(initialMarkerTrackingState, { type: 'found', slug: 'organicos' });
    state = reduceMarkerTracking(state, { type: 'found', slug: 'vidrio' });
    expect(state.activeSlug).toBe('organicos');
    state = reduceMarkerTracking(state, { type: 'lost', slug: 'organicos' });
    expect(state).toEqual({ visibleSlugs: ['vidrio'], activeSlug: 'vidrio' });
    state = reduceMarkerTracking(state, { type: 'lost', slug: 'vidrio' });
    expect(state.activeSlug).toBeNull();
    state = reduceMarkerTracking(state, { type: 'found', slug: 'vidrio' });
    expect(state.activeSlug).toBe('vidrio');
  });

  it('no repite detecciones ni permite que una etiqueta perdida borre otra activa', () => {
    let state = reduceMarkerTracking(initialMarkerTrackingState, { type: 'found', slug: 'vidrio' });
    const repeated = reduceMarkerTracking(state, { type: 'found', slug: 'vidrio' });
    expect(repeated).toBe(state);
    state = reduceMarkerTracking(state, { type: 'found', slug: 'electronicos' });
    state = reduceMarkerTracking(state, { type: 'lost', slug: 'electronicos' });
    expect(state.activeSlug).toBe('vidrio');
    state = reduceMarkerTracking(state, { type: 'lost', slug: 'vidrio' });
    expect(state.activeSlug).toBeNull();
    state = reduceMarkerTracking(state, { type: 'found', slug: 'vidrio' });
    expect(state.activeSlug).toBe('vidrio');
  });

  it('ignora categorías ajenas al catálogo y puede limpiar toda la sesión anterior', () => {
    const active = reduceMarkerTracking(initialMarkerTrackingState, { type: 'found', slug: 'vidrio' });
    expect(reduceMarkerTracking(active, { type: 'found', slug: 'otra-categoria' })).toBe(active);
    expect(reduceMarkerTracking(active, { type: 'reset' })).toEqual(initialMarkerTrackingState);
  });

  it('invalida callbacks de sesiones anteriores y descarta eventos posteriores al desmontaje', () => {
    expect(isCurrentARSession(7, 7, false)).toBe(true);
    expect(isCurrentARSession(7, 8, false)).toBe(false);
    expect(isCurrentARSession(7, 7, true)).toBe(false);
  });

  it('transiciona los paneles hidden → tracked → leaving → hidden al acabar animationend', () => {
    expect(nextMarkerPanelPhase('hidden', false)).toBe('hidden');
    expect(nextMarkerPanelPhase('hidden', true)).toBe('tracked');
    expect(nextMarkerPanelPhase('tracked', false)).toBe('leaving');
    expect(nextMarkerPanelPhase('leaving', false)).toBe('leaving');
    expect(nextMarkerPanelPhase('leaving', true)).toBe('tracked');
    expect(finishMarkerPanelExit('leaving', 'ar-card-exit')).toBe('hidden');
    expect(finishMarkerPanelExit('leaving', 'ar-ui-enter')).toBe('leaving');
  });
});

