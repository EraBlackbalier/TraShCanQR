import { CircleAlert, Focus, LoaderCircle, ScanLine, Sparkles } from 'lucide-react';

export type ARStatus = 'loading' | 'searching' | 'detected' | 'lost' | 'paused' | 'denied' | 'unsupported' | 'error';

const labels: Record<ARStatus, string> = {
  loading: 'Preparando realidad aumentada…',
  searching: 'Busca la etiqueta TraShCan',
  detected: 'Etiqueta detectada · seguimiento activo',
  lost: 'Etiqueta fuera de vista · vuelve a enfocarla',
  paused: 'Cámara pausada mientras la pestaña está en segundo plano',
  denied: 'Permiso de cámara denegado',
  unsupported: 'Este dispositivo no ofrece una cámara compatible',
  error: 'No pudimos iniciar el seguimiento',
};

export function ARTrackingStatus({ status, markerName }: { status: ARStatus; markerName?: string | null }) {
  const icon = status === 'loading' ? <LoaderCircle className="ar-spin" size={17} />
    : status === 'detected' ? <Sparkles size={17} />
      : status === 'error' || status === 'denied' || status === 'unsupported' ? <CircleAlert size={17} />
        : status === 'lost' ? <Focus size={17} /> : <ScanLine size={17} />;
  return <div className={`ar-status ar-status-${status}`} role="status" aria-live="polite">{icon}<span>{markerName && status === 'detected' ? `${markerName} · seguimiento activo` : labels[status]}</span></div>;
}
