'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CircleHelp, LoaderCircle } from 'lucide-react';
import type { Group, Mesh } from 'three';
import type { MindARThree as MindARThreeType, MindARAnchor } from 'mind-ar/dist/mindar-image-three.prod.js';
import { getBinBySlug } from '@/data/bins';
import { getMarkerBin, getMarkerCSSPanelPose, markerLabelGeometry, markerTargets } from '@/lib/ar/marker-config';
import { fitPanelToViewport, syncPanelAnchorPose } from '@/lib/ar/panel-anchor';
import { disposeARSession, finishMarkerPanelExit, initialMarkerTrackingState, isCurrentARSession, nextMarkerPanelPhase, reduceMarkerTracking } from '@/lib/ar/tracking';
import type { ARSessionLike } from '@/lib/ar/tracking';
import { ARControls } from './ARControls';
import { ARFallback } from './ARFallback';
import { ARInformationPanel } from './ARInformationPanel';
import { ARTrackingStatus, type ARStatus } from './ARTrackingStatus';

type MindARInstance = MindARThreeType & ARSessionLike & {
  scene: import('three').Scene;
  camera: import('three').Camera;
  cssScene: import('three').Scene;
  cssRenderer: import('mind-ar/dist/mindar-image-three.prod.js').MindARThree['cssRenderer'];
  renderer: import('three').WebGLRenderer;
  addAnchor(index: number): MindARAnchor;
  addCSSAnchor(index: number): MindARAnchor;
};

type ResizeRegistration = { listener: EventListenerOrEventListenerObject; options?: boolean | AddEventListenerOptions };

function constructMindAR(MindAR: typeof MindARThreeType, container: HTMLElement, environmentDeviceId?: string) {
  const resizeListeners: ResizeRegistration[] = [];
  const originalAdd = window.addEventListener;
  const intercept = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    if (type === 'resize') resizeListeners.push({ listener, options });
    Reflect.apply(originalAdd, window, [type, listener, options]);
  }) as typeof window.addEventListener;
  window.addEventListener = intercept;
  let mindar: MindARInstance;
  try {
    mindar = new MindAR({
      container,
      imageTargetSrc: '/ar/targets/trashcan-labels.mind',
      maxTrack: 1,
      uiLoading: 'no',
      uiScanning: 'no',
      uiError: 'no',
      warmupTolerance: 5,
      missTolerance: 8,
      filterMinCF: 0.0005,
      filterBeta: 0.12,
      ...(environmentDeviceId ? { environmentDeviceId } : {}),
    }) as MindARInstance;
  } finally {
    window.addEventListener = originalAdd;
  }
  return {
    mindar,
    removeResizeListeners: () => resizeListeners.forEach(({ listener, options }) => window.removeEventListener('resize', listener, options)),
  };
}

function errorKind(error: unknown): 'denied' | 'unsupported' | 'error' {
  const name = (error as { name?: string } | null)?.name;
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'unsupported';
  return 'error';
}

async function cameraPermissionDenied() {
  try {
    const permission = await navigator.permissions?.query({ name: 'camera' as PermissionName });
    return permission?.state === 'denied';
  } catch {
    return false;
  }
}

export function ARScene({ onExit }: { onExit: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<MindARInstance | null>(null);
  const panelElementsRef = useRef(new Map<number, HTMLElement>());
  const cleanupRef = useRef<(() => void) | null>(null);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const generationRef = useRef(0);
  const statusRef = useRef<ARStatus>('loading');
  const trackingRef = useRef(initialMarkerTrackingState);
  const [status, setStatus] = useState<ARStatus>('loading');
  const [tracking, dispatch] = useReducer(reduceMarkerTracking, initialMarkerTrackingState);
  const [attempt, setAttempt] = useState(0);
  const [cameraDeviceId, setCameraDeviceId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const updateStatus = useCallback((next: ARStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const updateTracking = useCallback((action: { type: 'found' | 'lost'; slug: string }) => {
    trackingRef.current = reduceMarkerTracking(trackingRef.current, action);
    // Apply selection before React effects/rendering so an old exit cannot overlap a new target.
    for (const target of markerTargets) {
      const element = panelElementsRef.current.get(target.targetIndex);
      if (!element) continue;
      const previous = element.classList.contains('is-tracked') ? 'tracked' : element.classList.contains('is-leaving') ? 'leaving' : 'hidden';
      const phase = nextMarkerPanelPhase(previous, trackingRef.current.activeSlug === target.slug, trackingRef.current.activeSlug !== null);
      element.classList.toggle('is-tracked', phase === 'tracked');
      element.classList.toggle('is-leaving', phase === 'leaving');
      element.inert = phase !== 'tracked';
      element.setAttribute('aria-hidden', String(phase !== 'tracked'));
    }
    dispatch(action);
    if (trackingRef.current.activeSlug) updateStatus('detected');
    else if (statusRef.current === 'detected') updateStatus('lost');
  }, [updateStatus]);

  const disposeCurrent = useCallback(() => {
    generationRef.current += 1;
    if (sessionRef.current) disposeARSession(sessionRef.current);
    sessionRef.current = null;
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (startPromiseRef.current) {
        await startPromiseRef.current;
        if (cancelled || document.hidden) return;
      }
      if (cancelled || document.hidden || sessionRef.current) return;
      const generation = ++generationRef.current;
      const isCurrent = () => isCurrentARSession(generation, generationRef.current, cancelled);

      const run = async () => {
        const container = containerRef.current;
        if (!container) return;
        updateStatus('loading');
        trackingRef.current = initialMarkerTrackingState;
        dispatch({ type: 'reset' });
        panelElementsRef.current.clear();
        try {
          const [{ MindARThree }, THREE, { CSS3DObject }] = await Promise.all([
            import('mind-ar/dist/mindar-image-three.prod.js'),
            import('three'),
            import('three/addons/renderers/CSS3DRenderer.js'),
          ]);
          if (!isCurrent()) return;

          const { mindar, removeResizeListeners } = constructMindAR(MindARThree, container, cameraDeviceId ?? undefined);
          sessionRef.current = mindar;
          cleanupRef.current = removeResizeListeners;
          mindar.cssRenderer.domElement.classList.add('ar-css-renderer');
          mindar.renderer.domElement.classList.add('ar-webgl-renderer');
          mindar.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
          const roots: Root[] = [];
          const decorations: Group[] = [];
          const panelObjects: Group[] = [];
          const animationListeners = new Map<HTMLElement, (event: AnimationEvent) => void>();
          let frame = 0;
          const resize = () => { if (isCurrent()) mindar.resize(); };
          const removeViewListeners = () => {
            if (frame) window.cancelAnimationFrame(frame);
            window.removeEventListener('orientationchange', resize);
            window.visualViewport?.removeEventListener('resize', resize);
            panelElementsRef.current.clear();
            panelObjects.forEach((object) => object.removeFromParent());
            animationListeners.forEach((listener, element) => element.removeEventListener('animationend', listener));
            roots.forEach((root) => root.unmount());
            decorations.forEach((group) => group.traverse((object) => {
              const mesh = object as Mesh;
              mesh.geometry?.dispose();
              const material = mesh.material;
              if (Array.isArray(material)) material.forEach((item) => item.dispose());
              else material?.dispose();
            }));
          };
          cleanupRef.current = () => { removeViewListeners(); removeResizeListeners(); };

          for (const target of markerTargets) {
            const bin = getMarkerBin(target.targetIndex);
            if (!bin) continue;
            const cssAnchor = mindar.addCSSAnchor(target.targetIndex);
            // MindAR toggles this probe's visibility every frame. Keep the actual panel in a
            // sibling CSS3D group so its state and exit animation cannot be overwritten.
            const probeElement = document.createElement('div');
            probeElement.setAttribute('aria-hidden', 'true');
            const probe = new CSS3DObject(probeElement);
            probe.visible = false;
            cssAnchor.group.add(probe);

            const element = document.createElement('div');
            element.className = 'ar-anchor-root';
            element.style.width = `${markerLabelGeometry.panelWidth}px`;
            element.style.height = `${markerLabelGeometry.panelHeight}px`;
            panelElementsRef.current.set(target.targetIndex, element);
            const onAnimationEnd = (event: AnimationEvent) => {
              if (event.target !== element.firstElementChild) return;
              const currentPhase = element.classList.contains('is-tracked') ? 'tracked' : element.classList.contains('is-leaving') ? 'leaving' : 'hidden';
              const phase = finishMarkerPanelExit(currentPhase, event.animationName);
              element.classList.toggle('is-leaving', phase === 'leaving');
            };
            animationListeners.set(element, onAnimationEnd);
            element.addEventListener('animationend', onAnimationEnd);
            element.inert = true;
            element.setAttribute('aria-hidden', 'true');
            const root = createRoot(element);
            roots.push(root);
            root.render(<ARInformationPanel bin={bin} />);
            const object = new CSS3DObject(element);
            const pose = getMarkerCSSPanelPose();
            object.position.set(pose.x, pose.y, pose.z);
            object.scale.setScalar(markerLabelGeometry.panelScale);
            const panelAnchor = new THREE.Group();
            panelAnchor.matrixAutoUpdate = false;
            panelAnchor.matrix.copy(cssAnchor.group.matrix);
            panelAnchor.add(object);
            mindar.cssScene.add(panelAnchor);
            panelObjects.push(panelAnchor);
            const projectedCorners = Array.from({ length: 4 }, () => new THREE.Vector3());
            cssAnchor.onTargetUpdate = () => {
              if (!isCurrent()) return;
              if (syncPanelAnchorPose(panelAnchor.matrix, cssAnchor.group.matrix, cssAnchor.visible)) {
                panelAnchor.matrixWorldNeedsUpdate = true;
                // Only shrink when close: keep marker-relative placement, never pin to screen.
                const halfWidth = markerLabelGeometry.panelWidth * markerLabelGeometry.panelScale / 2;
                const halfHeight = markerLabelGeometry.panelHeight * markerLabelGeometry.panelScale / 2;
                projectedCorners.forEach((point, index) => point.set(
                  pose.x + (index % 2 ? halfWidth : -halfWidth),
                  pose.y + (index < 2 ? halfHeight : -halfHeight),
                  pose.z,
                ).applyMatrix4(panelAnchor.matrix).project(mindar.camera));
                const width = (Math.max(...projectedCorners.map(point => point.x)) - Math.min(...projectedCorners.map(point => point.x))) / 2;
                const height = (Math.max(...projectedCorners.map(point => point.y)) - Math.min(...projectedCorners.map(point => point.y))) / 2;
                const scale = fitPanelToViewport(width, height, markerLabelGeometry.panelScale);
                if (Number.isFinite(scale)) {
                  object.scale.setScalar(scale);
                  // Preserve the gap above the QR even when the viewport requires a smaller card.
                  object.position.y = pose.y - markerLabelGeometry.panelHeight * (markerLabelGeometry.panelScale - scale) / 2;
                }
              }
            };
            cssAnchor.onTargetFound = () => {
              if (!isCurrent()) return;
              updateTracking({ type: 'found', slug: target.slug });
            };
            cssAnchor.onTargetLost = () => {
              if (!isCurrent()) return;
              updateTracking({ type: 'lost', slug: target.slug });
            };

            const visualAnchor = mindar.addAnchor(target.targetIndex);
            const ring = new THREE.Mesh(
              new THREE.TorusGeometry(0.38, 0.006, 6, 48),
              new THREE.MeshBasicMaterial({ color: bin.color, transparent: true, opacity: 0.8 }),
            );
            ring.position.z = 0.025;
            visualAnchor.group.add(ring);
            decorations.push(visualAnchor.group);
          }

          await mindar.start();
          if (!isCurrent()) {
            roots.forEach((root) => root.unmount());
            disposeARSession(mindar);
            return;
          }
          updateStatus(trackingRef.current.activeSlug ? 'detected' : 'searching');
          const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const render = () => {
            if (!isCurrent()) return;
            if (!reducedMotion) decorations.forEach((group) => { if (group.visible) group.rotation.z += 0.0018; });
            mindar.renderer.render(mindar.scene, mindar.camera);
            mindar.cssRenderer.render(mindar.cssScene, mindar.camera);
            frame = window.requestAnimationFrame(render);
          };
          frame = window.requestAnimationFrame(render);
          window.addEventListener('orientationchange', resize);
          window.visualViewport?.addEventListener('resize', resize);
        } catch (error) {
          if (!isCurrent()) return;
            if (sessionRef.current) {
              disposeARSession(sessionRef.current);
              sessionRef.current = null;
              cleanupRef.current?.();
              cleanupRef.current = null;
            }
          const denied = errorKind(error) === 'denied' || await cameraPermissionDenied();
            if (!isCurrent()) return;
          if (denied) {
            updateStatus('denied');
            return;
          }
          try {
            const devices = await navigator.mediaDevices?.enumerateDevices();
            const cameras = devices?.filter((device) => device.kind === 'videoinput') ?? [];
            if (cameras.length === 0) {
              updateStatus('unsupported');
              return;
            }
            if (cameraDeviceId) {
              updateStatus('error');
              return;
            }
            // MindAR's first request uses facingMode=environment. If unsupported, retry the rear-labeled device (or last available camera).
            const fallbackCamera = cameras.find((camera) => /back|rear|environment|trasera|posterior/i.test(camera.label)) ?? cameras[cameras.length - 1];
            if (!fallbackCamera || cancelled || !isCurrent()) return;
            setCameraDeviceId(fallbackCamera.deviceId);
            setAttempt((value) => value + 1);
            return;
          } catch (fallbackError) {
            if (cancelled) return;
            const deniedOnRetry = await cameraPermissionDenied();
            updateStatus(deniedOnRetry ? 'denied' : errorKind(fallbackError) === 'unsupported' ? 'unsupported' : 'error');
          }
        }
      };

      const promise = run();
      startPromiseRef.current = promise;
      try { await promise; } finally { if (startPromiseRef.current === promise) startPromiseRef.current = null; }
    };

    const onVisibility = () => {
      if (document.hidden) {
        if (sessionRef.current) disposeCurrent();
        updateStatus('paused');
      } else if (statusRef.current === 'paused') {
        void start();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    void start();
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      disposeCurrent();
    };
    // A retry remounts the tracker; catalog content and handlers are module-stable.
  }, [attempt, cameraDeviceId, disposeCurrent, updateStatus, updateTracking]);

  useEffect(() => {
    for (const target of markerTargets) {
      const root = panelElementsRef.current.get(target.targetIndex);
      if (root) {
        // Keep presentation tied to one explicit target and reject every stale/hidden category.
        const activeSlug = trackingRef.current.activeSlug;
        const active = activeSlug === target.slug;
        const previousPhase = root.classList.contains('is-tracked') ? 'tracked' : root.classList.contains('is-leaving') ? 'leaving' : 'hidden';
        const phase = nextMarkerPanelPhase(previousPhase, active, activeSlug !== null);
        root.classList.toggle('is-tracked', phase === 'tracked');
        root.classList.toggle('is-leaving', phase === 'leaving');
      }
    }
  }, [tracking.activeSlug]);

  const retry = () => {
    if (sessionRef.current) disposeCurrent();
    trackingRef.current = initialMarkerTrackingState;
    dispatch({ type: 'reset' });
    setAttempt((value) => value + 1);
  };
  const activeBin = tracking.activeSlug ? getBinBySlug(tracking.activeSlug) : undefined;
  const failed = status === 'denied' || status === 'unsupported' || status === 'error';

  return (
    <section className="ar-session" aria-label="Experiencia de realidad aumentada">
      <div className="ar-stage" ref={containerRef}>
        {status === 'loading' && <div className="ar-camera-placeholder"><LoaderCircle className="ar-spin" size={24} /><span>Preparando cámara…</span></div>}
      </div>
      <ARTrackingStatus status={status} markerName={activeBin?.name} />
      <ARControls />
      <button className="ar-help-button" onClick={() => setHelpOpen((open) => !open)} aria-expanded={helpOpen} aria-label="Instrucciones de realidad aumentada"><CircleHelp size={20} /></button>
      {helpOpen && <aside className="ar-help-card"><strong>Cómo encontrar el marcador</strong><p>Ilumina la etiqueta, mantén el teléfono a unos 25–50 cm y muévelo despacio hasta encuadrar el diseño completo.</p></aside>}
      {failed && <ARFallback status={status} onRetry={retry} />}
      <div className="ar-screen-reader" aria-live="polite">{activeBin ? `Información anclada a ${activeBin.name}` : status === 'lost' ? 'Seguimiento perdido. Busca la etiqueta de nuevo.' : ''}</div>
      <button className="ar-session-exit" onClick={onExit}>Salir de la realidad aumentada</button>
    </section>
  );
}
