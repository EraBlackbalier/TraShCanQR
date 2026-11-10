'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { CircleHelp, LoaderCircle } from 'lucide-react';
import type { AnimationMixer, Group } from 'three';
import type { MindARThree as MindARThreeType, MindARAnchor } from 'mind-ar/dist/mindar-image-three.prod.js';
import { getBinBySlug } from '@/data/bins';
import { getMarkerBin, getMarkerPanelPose, getMarkerQRPoint, markerLabelGeometry, markerTargets } from '@/lib/ar/marker-config';
import { createTrackingContinuity, disposeARSession, initialMarkerTrackingState, isCurrentARSession, reduceMarkerTracking } from '@/lib/ar/tracking';
import type { ARSessionLike } from '@/lib/ar/tracking';
import { ARControls } from './ARControls';
import { ARFallback } from './ARFallback';
import { ARInformationPanel, type DetailsOpener } from './ARInformationPanel';
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

const modelSources: Record<string, string> = {
  organicos: '/ar/models/organicos.glb?v=2',
  plasticos: '/ar/models/plasticos.glb?v=2',
  'papel-carton': '/ar/models/papel-carton.glb?v=2',
  vidrio: '/ar/models/vidrio.glb?v=2',
  'no-reciclables': '/ar/models/no-reciclables.glb?v=2',
  electronicos: '/ar/models/electronicos.glb?v=2',
};

const MODEL_ROTATION_SPEED = Math.PI / 8;
// Preserve the larger model footprint introduced in PR #28.
const MODEL_FRAME_WIDTH_FILL = 0.94;
const MODEL_FRAME_HEIGHT_FILL = 0.92;
const modelPanelPose = getMarkerPanelPose();
const modelFrame = {
  // The model uses the same reserved area as the old information card:
  // between the label title and the QR, with a small safety margin.
  x: modelPanelPose.x,
  y: modelPanelPose.y,
  z: modelPanelPose.z + 0.025,
  maxWidth: (markerLabelGeometry.panelWidth * markerLabelGeometry.panelScale / markerLabelGeometry.width) * MODEL_FRAME_WIDTH_FILL,
  maxHeight: (markerLabelGeometry.panelHeight * markerLabelGeometry.panelScale / markerLabelGeometry.width) * MODEL_FRAME_HEIGHT_FILL,
};

type ModelEntry = {
  anchor: Group;
  sourceAnchor: Group;
  content: Group;
  baseScale: number;
  mixer?: AnimationMixer;
  loaded: boolean;
  loading?: Promise<void>;
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
      missTolerance: 2,
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
  const modelEntriesRef = useRef(new Map<number, ModelEntry>());
  const detailOpenersRef = useRef(new Map<number, DetailsOpener>());
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
  const modelZoomRef = useRef(1);
  const changeModelZoom = useCallback((amount: number) => {
    modelZoomRef.current = Math.max(.65, Math.min(2.5, modelZoomRef.current + amount));
    modelEntriesRef.current.forEach((entry) => entry.content.scale.setScalar(entry.baseScale * modelZoomRef.current));
  }, []);

  const openActiveDetails = useCallback((focusTarget?: HTMLElement | null) => {
    const target = markerTargets.find((item) => item.slug === trackingRef.current.activeSlug);
    if (target) detailOpenersRef.current.get(target.targetIndex)?.(focusTarget);
  }, []);

  const updateStatus = useCallback((next: ARStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const updateTracking = useCallback((action: { type: 'found' | 'lost'; slug: string }) => {
    trackingRef.current = reduceMarkerTracking(trackingRef.current, action);
    for (const target of markerTargets) {
      const point = qrPointsRef.current.get(target.targetIndex);
      if (point) point.hidden = trackingRef.current.activeSlug !== target.slug;
      const model = modelEntriesRef.current.get(target.targetIndex);
      if (model?.loaded) model.content.visible = trackingRef.current.activeSlug === target.slug;
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
        modelEntriesRef.current.clear();
        qrPointsRef.current.clear();
        try {
          const [{ MindARThree }, THREE, { CSS3DObject }, { GLTFLoader }] = await Promise.all([
            import('mind-ar/dist/mindar-image-three.prod.js'),
            import('three'),
            import('three/addons/renderers/CSS3DRenderer.js'),
            import('three/addons/loaders/GLTFLoader.js'),
          ]);
          if (!isCurrent()) return;

          const { mindar, removeResizeListeners } = constructMindAR(MindARThree, container, cameraDeviceId ?? undefined);
          sessionRef.current = mindar;
          cleanupRef.current = removeResizeListeners;
          mindar.cssRenderer.domElement.classList.add('ar-css-renderer');
          mindar.renderer.domElement.classList.add('ar-webgl-renderer');
          mindar.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
          mindar.scene.add(new THREE.HemisphereLight(0xffffff, 0x263b30, 2.1));
          const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
          keyLight.position.set(0.4, 0.8, 1.2);
          mindar.scene.add(keyLight);
          const continuity = createTrackingContinuity(action => {
            if (isCurrent()) updateTracking(action);
          }, 350);
          const modelMotionUpdaters: ((delta: number) => void)[] = [];
          const modelLoader = new GLTFLoader();
          const mixers: AnimationMixer[] = [];
          const pointAnchors: Group[] = [];
          const raycaster = new THREE.Raycaster();
          const pointer = new THREE.Vector2();
          let frame = 0;
          const clock = new THREE.Clock();
          const resize = () => { if (isCurrent()) mindar.resize(); };
          const disposeModel = (root: Group) => {
            root.traverse((object) => {
              if (!(object instanceof THREE.Mesh)) return;
              object.geometry.dispose();
              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach((material) => {
                Object.values(material).forEach((value) => {
                  if (value && typeof value === 'object' && 'isTexture' in value) {
                    (value as { dispose?: () => void }).dispose?.();
                  }
                });
                material.dispose();
              });
            });
          };
          const handleModelPointerUp = (event: PointerEvent) => {
            const activeTarget = markerTargets.find((target) => target.slug === trackingRef.current.activeSlug);
            if (!activeTarget) return;
            const entry = modelEntriesRef.current.get(activeTarget.targetIndex);
            if (!entry?.loaded || !entry.content.visible) return;
            const bounds = mindar.renderer.domElement.getBoundingClientRect();
            if (!bounds.width || !bounds.height) return;
            pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
            pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
            raycaster.setFromCamera(pointer, mindar.camera);
            if (raycaster.intersectObject(entry.content, true).length > 0) openActiveDetails();
          };
          const removeViewListeners = () => {
            continuity.dispose();
            if (frame) window.cancelAnimationFrame(frame);
            window.removeEventListener('orientationchange', resize);
            window.visualViewport?.removeEventListener('resize', resize);
            mindar.renderer.domElement.removeEventListener('pointerup', handleModelPointerUp);
            qrPointsRef.current.clear();
            modelEntriesRef.current.forEach((entry) => {
              disposeModel(entry.anchor);
              entry.anchor.removeFromParent();
              entry.sourceAnchor.removeFromParent();
            });
            modelEntriesRef.current.clear();
            pointAnchors.forEach((anchor) => anchor.removeFromParent());
          };
          cleanupRef.current = () => { removeViewListeners(); removeResizeListeners(); };

          for (const target of markerTargets) {
            const bin = getMarkerBin(target.targetIndex);
            if (!bin) continue;
            const cssAnchor = mindar.addCSSAnchor(target.targetIndex);
            // MindAR toggles this probe's visibility every frame. Keep the QR point in a
            // sibling CSS3D group so its state cannot be overwritten.
            const probeElement = document.createElement('div');
            probeElement.setAttribute('aria-hidden', 'true');
            const probe = new CSS3DObject(probeElement);
            probe.visible = false;
            cssAnchor.group.add(probe);

            const webglAnchor = mindar.addAnchor(target.targetIndex);
            const modelAnchor = new THREE.Group();
            modelAnchor.matrixAutoUpdate = false;
            modelAnchor.matrix.copy(webglAnchor.group.matrix);
            const modelContent = new THREE.Group();
            modelContent.visible = false;
            modelAnchor.add(modelContent);
            mindar.scene.add(modelAnchor);
            const modelEntry: ModelEntry = { anchor: modelAnchor, sourceAnchor: webglAnchor.group, content: modelContent, baseScale: 1, loaded: false };
            modelEntriesRef.current.set(target.targetIndex, modelEntry);
            const targetModelMatrix = new THREE.Matrix4().copy(webglAnchor.group.matrix);
            const currentPosition = new THREE.Vector3();
            const currentRotation = new THREE.Quaternion();
            const currentScale = new THREE.Vector3();
            const targetPosition = new THREE.Vector3();
            const targetRotation = new THREE.Quaternion();
            const targetScale = new THREE.Vector3();
            modelMotionUpdaters.push((delta) => {
              // Interpolar la pose evita que el modelo tiemble cuando MindAR actualiza el marcador.
              modelAnchor.matrix.decompose(currentPosition, currentRotation, currentScale);
              targetModelMatrix.decompose(targetPosition, targetRotation, targetScale);
              currentPosition.lerp(targetPosition, 0.22);
              currentRotation.slerp(targetRotation, 0.22);
              currentScale.lerp(targetScale, 0.22);
              modelAnchor.matrix.compose(currentPosition, currentRotation, currentScale);
              modelAnchor.matrixWorldNeedsUpdate = true;
              if (modelEntry.loaded && modelEntry.content.visible) {
                modelEntry.content.rotation.y = (modelEntry.content.rotation.y + delta * MODEL_ROTATION_SPEED) % (Math.PI * 2);
              }
            });

            const loadModel = async () => {
              if (modelEntry.loading) return modelEntry.loading;
              const source = modelSources[bin.slug];
              if (!source) return;
              modelEntry.loading = modelLoader.loadAsync(source).then((gltf) => {
                if (!isCurrent()) return;
                const model = gltf.scene;
                const bounds = new THREE.Box3().setFromObject(model);
                const center = bounds.getCenter(new THREE.Vector3());
                const size = bounds.getSize(new THREE.Vector3());
                const largestDimension = Math.max(size.x, size.y, size.z, 0.001);
                const horizontalSize = Math.max(size.x, size.z, 0.001);
                model.position.sub(center);
                const fittedScale = Math.min(modelFrame.maxWidth / horizontalSize, modelFrame.maxHeight / Math.max(size.y, 0.001));
                modelEntry.baseScale = Number.isFinite(fittedScale) && fittedScale > 0
                  ? fittedScale
                  : 0.42 / largestDimension;
                modelEntry.content.position.set(modelFrame.x, modelFrame.y, modelFrame.z);
                modelEntry.content.scale.setScalar(modelEntry.baseScale * modelZoomRef.current);
                model.traverse((object) => {
                  if ('frustumCulled' in object) object.frustumCulled = false;
                });
                modelEntry.content.add(model);
                modelEntry.mixer = gltf.animations.length ? new THREE.AnimationMixer(model) : undefined;
                gltf.animations.forEach((clip) => modelEntry.mixer?.clipAction(clip).play());
                if (modelEntry.mixer) mixers.push(modelEntry.mixer);
                modelEntry.loaded = true;
                modelEntry.content.visible = trackingRef.current.activeSlug === target.slug;
              }).catch((error) => {
                modelEntry.loading = undefined;
                console.error(`No se pudo cargar el modelo AR de ${bin.name}`, error);
              });
              return modelEntry.loading;
            };

            const qrPoint = getMarkerQRPoint();
            const pointElement = document.createElement('div');
            pointElement.className = 'ar-qr-point';
            pointElement.hidden = true;
            pointElement.setAttribute('aria-hidden', 'true');
            pointElement.style.setProperty('--bin-color', bin.color);
            qrPointsRef.current.set(target.targetIndex, pointElement);
            const pointObject = new CSS3DObject(pointElement);
            pointObject.position.set(qrPoint.x * 1000, qrPoint.y * 1000, 0);
            const pointAnchor = new THREE.Group();
            pointAnchor.matrixAutoUpdate = false;
            pointAnchor.matrix.copy(cssAnchor.group.matrix);
            pointAnchor.add(pointObject);
            mindar.cssScene.add(pointAnchor);
            pointAnchors.push(pointAnchor);
            cssAnchor.onTargetUpdate = () => {
              if (!isCurrent()) return;
              if (cssAnchor.visible) {
                pointAnchor.matrix.copy(cssAnchor.group.matrix);
              }
            };
            webglAnchor.onTargetUpdate = () => {
              if (!isCurrent()) return;
              if (webglAnchor.visible) targetModelMatrix.copy(webglAnchor.group.matrix);
            };
            cssAnchor.onTargetFound = () => {
              if (!isCurrent()) return;
              void loadModel();
              continuity.found(target.slug);
            };
            cssAnchor.onTargetLost = () => {
              if (!isCurrent()) return;
              modelEntry.content.visible = false;
              continuity.lost(target.slug);
            };
          }

          mindar.renderer.domElement.addEventListener('pointerup', handleModelPointerUp);

          await mindar.start();
          if (!isCurrent()) {
            disposeARSession(mindar);
            return;
          }
          updateStatus(trackingRef.current.activeSlug ? 'detected' : 'searching');
          const render = () => {
            if (!isCurrent()) return;
            const delta = clock.getDelta();
            modelMotionUpdaters.forEach(update => update(delta));
            mixers.forEach((mixer) => mixer.update(delta));
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
  }, [attempt, cameraDeviceId, disposeCurrent, openActiveDetails, updateStatus, updateTracking]);

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
      {markerTargets.map((target) => {
        const bin = getMarkerBin(target.targetIndex);
        if (!bin) return null;
        return <ARInformationPanel key={target.slug} bin={bin} onOpenReady={(open) => {
          if (open) detailOpenersRef.current.set(target.targetIndex, open);
          else detailOpenersRef.current.delete(target.targetIndex);
        }} />;
      })}
      <ARTrackingStatus status={status} markerName={activeBin?.name} />
      <ARControls onZoomIn={() => changeModelZoom(.15)} onZoomOut={() => changeModelZoom(-.15)} onOpenDetails={openActiveDetails} canOpenDetails={Boolean(activeBin)} />
      <button className="ar-help-button" onClick={() => setHelpOpen((open) => !open)} aria-expanded={helpOpen} aria-label="Instrucciones de realidad aumentada"><CircleHelp size={20} /></button>
      {helpOpen && <aside className="ar-help-card"><strong>Cómo encontrar el marcador</strong><p>Ilumina la etiqueta, mantén el teléfono a unos 25–50 cm y muévelo despacio hasta encuadrar el diseño completo.</p></aside>}
      {failed && <ARFallback status={status} onRetry={retry} />}
      <div className="ar-screen-reader" aria-live="polite">{activeBin ? `Información anclada a ${activeBin.name}` : status === 'lost' ? 'Seguimiento perdido. Busca la etiqueta de nuevo.' : ''}</div>
      <button className="ar-session-exit" onClick={onExit}>Salir de la realidad aumentada</button>
    </section>
  );
}
