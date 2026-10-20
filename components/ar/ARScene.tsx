'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CircleHelp, LoaderCircle } from 'lucide-react';
import type { Group } from 'three';
import type { MindARThree as MindARThreeType, MindARAnchor } from 'mind-ar/dist/mindar-image-three.prod.js';
import { getBinBySlug } from '@/data/bins';
import { getMarkerBin, getMarkerCSSPanelPose, getMarkerQRPoint, markerLabelGeometry, markerTargets } from '@/lib/ar/marker-config';
import { createTrackingContinuity, disposeARSession, finishMarkerPanelExit, initialMarkerTrackingState, isCurrentARSession, nextMarkerPanelPhase, reduceMarkerTracking } from '@/lib/ar/tracking';
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
      warmupTolerance: 0,
      missTolerance: 3,
      // MindAR 1.2.5 defaults use milliseconds: 0.001 cutoff and beta 1000.
      // Keep its adaptive filter instead of adding distance/orientation lag.
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

/**
 * Punto de entrada para la sesión AR: cámara, seguimiento y enlace espacial.
 * Para editar la tarjeta usa ARInformationPanel; su ilustración vive en
 * BinIllustration y las reglas por categoría vienen de data/bins.ts.
 * ARControls contiene los controles visibles durante la sesión.
 */
export function ARScene({ onExit }: { onExit: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<MindARInstance | null>(null);
  const panelElementsRef = useRef(new Map<number, HTMLElement>());
  const qrPointsRef = useRef(new Map<number, HTMLElement>());
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
    for (const target of markerTargets) {
      const point = qrPointsRef.current.get(target.targetIndex);
      if (point) point.hidden = trackingRef.current.activeSlug !== target.slug;
    }
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
        qrPointsRef.current.clear();
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
          const continuity = createTrackingContinuity(action => {
            if (isCurrent()) updateTracking(action);
          });
          const roots: Root[] = [];
          const panelObjects: Group[] = [];
          const panelPositioners: (() => void)[] = [];
          const panelMotionUpdaters: (() => void)[] = [];
          const animationListeners = new Map<HTMLElement, (event: AnimationEvent) => void>();
          let frame = 0;
          const syncDeviceOrientation = () => {
            const isTouchDevice = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
            const reportedAngle = typeof screen.orientation?.angle === 'number' ? screen.orientation.angle : window.orientation;
            const angle = isTouchDevice ? (reportedAngle || (window.innerWidth > window.innerHeight ? 90 : 0)) : 0;
            container.querySelectorAll<HTMLElement>('.ar-readable-anchor').forEach((element) => {
              element.style.setProperty('--device-rotation', `${angle}deg`);
            });
          };
          const tiltWithDevice = (event: DeviceOrientationEvent) => {
            const tiltX = Math.max(-12, Math.min(12, ((event.beta ?? 45) - 45) * 0.28));
            const tiltY = Math.max(-12, Math.min(12, (event.gamma ?? 0) * 0.45));
            container.querySelectorAll<HTMLElement>('.ar-anchor-card').forEach((card) => {
              card.style.setProperty('--device-tilt-x', `${tiltX}deg`);
              card.style.setProperty('--device-tilt-y', `${tiltY}deg`);
            });
          };
          const resize = () => { if (isCurrent()) mindar.resize(); syncDeviceOrientation(); };
          const removeViewListeners = () => {
            continuity.dispose();
            if (frame) window.cancelAnimationFrame(frame);
            window.removeEventListener('orientationchange', resize);
            window.visualViewport?.removeEventListener('resize', resize);
            panelElementsRef.current.clear();
            qrPointsRef.current.clear();
            panelObjects.forEach((object) => object.removeFromParent());
            animationListeners.forEach((listener, element) => element.removeEventListener('animationend', listener));
            roots.forEach((root) => root.unmount());
            container.querySelectorAll('.ar-readable-anchor').forEach(element => element.remove());
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
            element.className = 'ar-anchor-root ar-readable-anchor';
            element.style.setProperty('--device-rotation', '0deg');
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
            const pose = getMarkerCSSPanelPose();
            const panelAnchor = new THREE.Group();
            panelAnchor.matrixAutoUpdate = false;
            panelAnchor.matrix.copy(cssAnchor.group.matrix);
            const targetPanelMatrix = new THREE.Matrix4().copy(cssAnchor.group.matrix);
            panelMotionUpdaters.push(() => {
              const current = panelAnchor.matrix.elements;
              const target = targetPanelMatrix.elements;
              for (let index = 0; index < 16; index += 1) {
                current[index] += (target[index] - current[index]) * 0.22;
              }
              panelAnchor.matrixWorldNeedsUpdate = true;
            });
            const panelObject = new CSS3DObject(element);
            const panelScale = 1.35;
            const panelClearance = 220;
            panelObject.scale.setScalar(panelScale);
            panelObject.position.set(pose.x - markerLabelGeometry.panelWidth * panelScale / 2, pose.y + panelClearance - markerLabelGeometry.panelHeight * panelScale / 2, pose.z);
            panelAnchor.add(panelObject);
            mindar.cssScene.add(panelAnchor);
            panelObjects.push(panelAnchor);
            const qrPoint = getMarkerQRPoint();
            const pointElement = document.createElement('div');
            pointElement.className = 'ar-qr-point';
            pointElement.hidden = true;
            pointElement.setAttribute('aria-hidden', 'true');
            pointElement.style.setProperty('--bin-color', bin.color);
            qrPointsRef.current.set(target.targetIndex, pointElement);
            const pointObject = new CSS3DObject(pointElement);
            pointObject.position.set(qrPoint.x * 1000, qrPoint.y * 1000, 0);
            panelAnchor.add(pointObject);
            cssAnchor.onTargetUpdate = () => {
              if (!isCurrent()) return;
              if (cssAnchor.visible) {
                targetPanelMatrix.copy(cssAnchor.group.matrix);
              }
            };
            cssAnchor.onTargetFound = () => {
              if (!isCurrent()) return;
              continuity.found(target.slug);
            };
            cssAnchor.onTargetLost = () => {
              if (!isCurrent()) return;
              continuity.lost(target.slug);
            };
          }

          await mindar.start();
          if (!isCurrent()) {
            roots.forEach((root) => root.unmount());
            container.querySelectorAll('.ar-readable-anchor').forEach(element => element.remove());
            disposeARSession(mindar);
            return;
          }
          updateStatus(trackingRef.current.activeSlug ? 'detected' : 'searching');
          const render = () => {
            if (!isCurrent()) return;
            panelMotionUpdaters.forEach(update => update());
            panelPositioners.forEach(position => position());
            mindar.renderer.render(mindar.scene, mindar.camera);
            mindar.cssRenderer.render(mindar.cssScene, mindar.camera);
            frame = window.requestAnimationFrame(render);
          };
          frame = window.requestAnimationFrame(render);
          window.addEventListener('orientationchange', resize);
          screen.orientation?.addEventListener('change', syncDeviceOrientation);
          window.addEventListener('deviceorientation', tiltWithDevice);
          syncDeviceOrientation();
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
