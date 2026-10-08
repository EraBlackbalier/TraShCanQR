'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { Camera, CameraOff, CircleAlert, X } from 'lucide-react';
import { getBinBySlug } from '@/data/bins';
import { getPublicBaseUrl, resolveBinQr } from '@/lib/qr';
import { BinDetails } from '@/components/bins/BinDetails';

type ScannerState = 'starting' | 'scanning' | 'unsupported' | 'denied' | 'error';

let cameraRequestQueue: Promise<void> = Promise.resolve();

async function withCameraRequestLock<T>(operation: () => Promise<T>): Promise<T> {
  const previousRequest = cameraRequestQueue;
  let unlock!: () => void;
  cameraRequestQueue = new Promise<void>((resolve) => { unlock = resolve; });
  await previousRequest;
  try {
    return await operation();
  } finally {
    unlock();
  }
}

function stopVideoStream(video: HTMLVideoElement | null) {
  const stream = video?.srcObject as MediaStream | null | undefined;
  if (stream && typeof stream.getTracks === 'function') stream.getTracks().forEach((track) => track.stop());
  if (video) video.srcObject = null;
}

function cameraErrorState(error: unknown): ScannerState {
  const name = error instanceof DOMException ? error.name : (error as { name?: string } | null)?.name;
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'unsupported';
  return 'error';
}

function canRetryWithAnyCamera(error: unknown) {
  const name = error instanceof DOMException ? error.name : (error as { name?: string } | null)?.name;
  return name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError' || name === 'NotFoundError' || name === 'DevicesNotFoundError';
}

export function Scanner({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const sessionIdRef = useRef(0);
  const [state, setState] = useState<ScannerState>('starting');
  const [resultSlug, setResultSlug] = useState<string | null>(null);
  const [unknownMessage, setUnknownMessage] = useState('');
  const [scanSession, setScanSession] = useState(1);

  const scanAnother = useCallback(() => {
    setResultSlug(null);
    setUnknownMessage('');
    setState('starting');
    setScanSession((session) => session + 1);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const sessionId = ++sessionIdRef.current;
    let cancelled = false;
    let handled = false;
    let localControls: IScannerControls | null = null;
    const isCurrent = () => !cancelled && sessionIdRef.current === sessionId;
    const stopSession = (controls = localControls) => {
      controls?.stop();
      if (controlsRef.current === controls) controlsRef.current = null;
      localControls = null;
      stopVideoStream(video);
    };

    if (!video) {
      setState('error');
      setUnknownMessage('No encontramos el visor de cámara. Cierra y vuelve a abrir el escáner.');
      return () => { cancelled = true; };
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      return () => { cancelled = true; };
    }

    const reader = new BrowserMultiFormatReader();
    const handleDecode = (result: { getText(): string } | undefined, _error: unknown, callbackControls: IScannerControls) => {
      if (!isCurrent()) {
        callbackControls.stop();
        return;
      }
      localControls = callbackControls;
      controlsRef.current = callbackControls;
      if (!result || handled) return;
      handled = true;
      stopSession(callbackControls);
      const allowedOrigin = getPublicBaseUrl(window.location.origin);
      const resolution = resolveBinQr(result.getText(), allowedOrigin);
      if (resolution.ok) {
        setResultSlug(resolution.binSlug);
      } else {
        setUnknownMessage(resolution.reason === 'unknown'
          ? 'Ese código corresponde a una categoría que todavía no está disponible.'
          : resolution.reason === 'external'
            ? 'Este código no pertenece a TraShCan. Escanea el QR de un bote TraShCan.'
            : 'No pudimos reconocer un código de bote válido. Intenta escanearlo de nuevo.');
        setState('error');
      }
    };

    const begin = async () => {
      try {
        const controls = await withCameraRequestLock(async () => {
          // ZXing 0.1.5 maps an undefined device id to facingMode: environment.
          // If that constraint is unavailable, retry with the browser's default camera.
          let activeControls: IScannerControls;
          try {
            activeControls = await reader.decodeFromVideoDevice(undefined, video, handleDecode);
          } catch (error) {
            if (!canRetryWithAnyCamera(error) || !isCurrent()) throw error;
            activeControls = await reader.decodeFromConstraints({ video: true }, video, handleDecode);
          }
          if (!isCurrent()) {
            activeControls.stop();
            stopVideoStream(video);
            return null;
          }
          return activeControls;
        });
        if (!controls) return;
        localControls = controls;
        controlsRef.current = controls;
        if (!handled) setState('scanning');
      } catch (error) {
        if (!isCurrent()) return;
        stopSession();
        const nextState = cameraErrorState(error);
        setState(nextState);
        if (nextState === 'denied') {
          setUnknownMessage('Permite el acceso a la cámara en los ajustes del navegador y vuelve a intentarlo.');
        } else if (nextState === 'unsupported') {
          setUnknownMessage('Prueba con un dispositivo que tenga cámara y abre el sitio desde HTTPS o localhost.');
        } else {
          setUnknownMessage('No se pudo iniciar la cámara. Comprueba que otra aplicación no la esté usando.');
        }
      }
    };

    void begin();

    return () => {
      cancelled = true;
      sessionIdRef.current += 1;
      stopSession();
    };
  }, [scanSession]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const bin = resultSlug ? getBinBySlug(resultSlug) : undefined;

  return (
    <div className="scanner-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="scanner-dialog" role="dialog" aria-modal="true" aria-label="Escanear código QR">
        <button className="scanner-close" onClick={onClose} aria-label="Cerrar escáner"><X size={22} /></button>
        {bin && <BinDetails bin={bin} compact onScanAnother={scanAnother} onClose={onClose} />}
        <div className="scanner-title" hidden={Boolean(bin)}><span className="eyebrow">LECTOR DE BOTES</span><h2>Escanea el código QR</h2><p>Apunta la cámara al código del bote para consultar qué puedes depositar.</p></div>
        <div className="camera-view" hidden={Boolean(bin)}>
          <video ref={videoRef} className={state === 'scanning' ? 'camera-video active' : 'camera-video'} muted playsInline aria-label="Vista previa de la cámara" />
          {state === 'scanning' && <div className="scan-frame" aria-hidden="true"><i /><i /><i /><i /><span /></div>}
          {state !== 'scanning' && <div className="camera-state">
            {state === 'starting' ? <><span className="loading-ring" /><strong>Iniciando cámara…</strong><span>El navegador puede pedir permiso.</span></> : null}
            {state === 'denied' ? <><CameraOff size={30} /><strong>Permiso de cámara denegado</strong><span>{unknownMessage}</span><button className="button button-light" onClick={scanAnother}>Intentar de nuevo</button></> : null}
            {state === 'unsupported' ? <><CameraOff size={30} /><strong>No encontramos una cámara</strong><span>{unknownMessage}</span><button className="button button-light" onClick={scanAnother}>Intentar de nuevo</button></> : null}
            {state === 'error' ? <><CircleAlert size={30} /><strong>No pudimos leer ese código</strong><span>{unknownMessage}</span><button className="button button-light" onClick={scanAnother}>Escanear de nuevo</button></> : null}
          </div>}
        </div>
        {!bin && state === 'scanning' && <p className="scanner-hint"><Camera size={16} /> Mantén el código dentro del recuadro</p>}
      </section>
    </div>
  );
}
