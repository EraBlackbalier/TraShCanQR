'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { Camera, CameraOff, CircleAlert, X } from 'lucide-react';
import { getBinBySlug } from '@/data/bins';
import { resolveBinQr } from '@/lib/qr';
import { BinDetails } from '@/components/bins/BinDetails';

type ScannerState = 'starting' | 'scanning' | 'unsupported' | 'denied' | 'error';

export function Scanner({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const handledRef = useRef(false);
  const [state, setState] = useState<ScannerState>('starting');
  const [resultSlug, setResultSlug] = useState<string | null>(null);
  const [unknownMessage, setUnknownMessage] = useState('');

  const startCamera = useCallback(async () => {
    handledRef.current = false;
    setResultSlug(null);
    setUnknownMessage('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      return;
    }
    setState('starting');
    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result, _error, activeControls) => {
        controlsRef.current = activeControls;
        if (!result || handledRef.current) return;
        handledRef.current = true;
        const resolution = resolveBinQr(result.getText(), process.env.NEXT_PUBLIC_SITE_URL);
        activeControls.stop();
        if (resolution.ok) {
          setResultSlug(resolution.binSlug);
        } else {
          const message = resolution.reason === 'unknown'
            ? 'Ese código apunta a una categoría que todavía no está disponible.'
            : resolution.reason === 'external'
              ? 'Este código no pertenece a TraShCan. Escanea un QR de un bote TraShCan.'
              : 'No pudimos reconocer un código de bote válido. Intenta de nuevo.';
          setUnknownMessage(message);
          setState('error');
        }
      });
      controlsRef.current = controls;
      setState('scanning');
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      setState(name === 'NotAllowedError' || name === 'PermissionDeniedError' ? 'denied' : name === 'NotFoundError' ? 'unsupported' : 'error');
      if (name !== 'NotAllowedError' && name !== 'PermissionDeniedError' && name !== 'NotFoundError') {
        setUnknownMessage('No se pudo iniciar la cámara. Comprueba que otra aplicación no la esté usando.');
      }
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    void startCamera();
    return () => {
      controlsRef.current?.stop();
      const stream = video?.srcObject;
      if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
      readerRef.current = null;
    };
  }, [startCamera]);

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
        {bin ? <BinDetails bin={bin} compact onScanAnother={() => { void startCamera(); }} /> : <>
          <div className="scanner-title"><span className="eyebrow">LECTOR DE BOTES</span><h2>Escanea el código QR</h2><p>Apunta la cámara al código del bote para consultar qué puedes depositar.</p></div>
          <div className="camera-view">
            <video ref={videoRef} className={state === 'scanning' ? 'camera-video active' : 'camera-video'} muted playsInline aria-label="Vista previa de la cámara" />
            {state === 'scanning' && <div className="scan-frame" aria-hidden="true"><i /><i /><i /><i /><span /></div>}
            {state !== 'scanning' && <div className="camera-state">
              {state === 'starting' ? <><span className="loading-ring" /><strong>Iniciando cámara…</strong><span>El navegador puede pedir permiso.</span></> : null}
              {state === 'denied' ? <><CameraOff size={30} /><strong>Permiso de cámara denegado</strong><span>Permite el acceso en los ajustes del navegador y vuelve a intentarlo.</span><button className="button button-light" onClick={() => void startCamera()}>Intentar de nuevo</button></> : null}
              {state === 'unsupported' ? <><CameraOff size={30} /><strong>No encontramos una cámara</strong><span>Prueba en un dispositivo con cámara y abre el sitio en HTTPS o localhost.</span></> : null}
              {state === 'error' ? <><CircleAlert size={30} /><strong>Necesitamos otro intento</strong><span>{unknownMessage}</span><button className="button button-light" onClick={() => void startCamera()}>Escanear de nuevo</button></> : null}
            </div>}
          </div>
          {state === 'scanning' && <p className="scanner-hint"><Camera size={16} /> Mantén el código dentro del recuadro</p>}
        </>}
      </section>
    </div>
  );
}
