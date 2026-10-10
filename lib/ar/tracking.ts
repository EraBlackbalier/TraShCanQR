import { getBinBySlug } from '@/data/bins';

export interface MarkerTrackingState {
  visibleSlugs: string[];
  activeSlug: string | null;
}

export type MarkerTrackingAction = { type: 'found' | 'lost'; slug: string } | { type: 'reset' };

export const initialMarkerTrackingState: MarkerTrackingState = { visibleSlugs: [], activeSlug: null };

/** Keep one active label at a time; select another visible label after the active one is lost. */
export function reduceMarkerTracking(state: MarkerTrackingState, action: MarkerTrackingAction): MarkerTrackingState {
  if (action.type === 'reset') return initialMarkerTrackingState;
  if (!getBinBySlug(action.slug)) return state;
  if (action.type === 'found') {
    if (state.visibleSlugs.includes(action.slug)) return state;
    const visibleSlugs = [...state.visibleSlugs, action.slug];
    return { visibleSlugs, activeSlug: state.activeSlug ?? action.slug };
  }
  const visibleSlugs = state.visibleSlugs.filter((slug) => slug !== action.slug);
  const activeSlug = state.activeSlug === action.slug ? (visibleSlugs[0] ?? null) : state.activeSlug;
  return { visibleSlugs, activeSlug };
}

export function isCurrentARSession(capturedGeneration: number, currentGeneration: number, cancelled: boolean): boolean {
  return !cancelled && capturedGeneration === currentGeneration;
}

export type MarkerPanelPhase = 'hidden' | 'tracked' | 'leaving';

/** Stable target changes start/finish visual phases without introducing a time-based hide race. */
export function nextMarkerPanelPhase(current: MarkerPanelPhase, isActive: boolean): MarkerPanelPhase {
  if (isActive) return 'tracked';
  if (current === 'tracked' || current === 'leaving') return 'leaving';
  return 'hidden';
}

export function finishMarkerPanelExit(current: MarkerPanelPhase, animationName: string): MarkerPanelPhase {
  return current === 'leaving' && animationName === 'ar-card-exit' ? 'hidden' : current;
}

export type ARSessionLike = {
  stop(): void;
  controller?: { dispose(): void };
  renderer?: { dispose(): void; forceContextLoss?(): void; domElement?: HTMLElement };
  cssRenderer?: { domElement?: HTMLElement };
  video?: HTMLVideoElement;
};

const disposedSessions = new WeakSet<object>();

/** Idempotent teardown for MindAR, its camera stream, workers and render surfaces. */
export function disposeARSession(session: ARSessionLike | null | undefined): void {
  if (!session || disposedSessions.has(session)) return;
  disposedSessions.add(session);
  try { session.stop(); } catch { /* start may have failed before the camera was initialized */ }
  try { session.controller?.dispose(); } catch { /* worker may already be stopped */ }
  try { session.renderer?.dispose(); } catch { /* WebGL context may already be lost */ }
  try { session.renderer?.forceContextLoss?.(); } catch { /* context teardown is best effort */ }
  session.renderer?.domElement?.remove();
  session.cssRenderer?.domElement?.remove();
  const stream = session.video?.srcObject as MediaStream | null | undefined;
  if (stream && typeof stream.getTracks === 'function') stream.getTracks().forEach((track) => track.stop());
  if (session.video) {
    session.video.pause();
    session.video.srcObject = null;
    session.video.remove();
  }
};
