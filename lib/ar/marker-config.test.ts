import { describe, expect, it } from 'vitest';
import { bins } from '@/data/bins';
import { getMarkerBin, getMarkerPanelPose, getMarkerTargetIndex, markerLabelGeometry, markerTargets } from '@/lib/ar/marker-config';
import { initialMarkerTrackingState, reduceMarkerTracking } from '@/lib/ar/tracking';

describe('marcadores TraShCan', () => {
  it('mapea explícitamente y sin duplicados las seis etiquetas al catálogo', () => {
    expect(markerTargets.map(({ slug }) => slug)).toEqual(bins.map(({ slug }) => slug));
    expect(new Set(markerTargets.map(({ targetIndex }) => targetIndex)).size).toBe(6);
    expect(getMarkerTargetIndex('vidrio')).toBe(3);
    expect(getMarkerBin(3)?.slug).toBe('vidrio');
    expect(getMarkerBin(99)).toBeUndefined();
  });

  it('alinea el borde inferior del panel encima del QR según la geometría impresa', () => {
    const pose = getMarkerPanelPose();
    const panelBottomInImagePixels = markerLabelGeometry.height / 2 - pose.y * markerLabelGeometry.width + markerLabelGeometry.panelHeight * markerLabelGeometry.panelScale / 2;
    expect(panelBottomInImagePixels).toBeCloseTo(markerLabelGeometry.qrCardTop - markerLabelGeometry.panelGap, 8);
    expect(pose.x).toBe(0);
    expect(pose.z).toBeGreaterThan(0);
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
});

