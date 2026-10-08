import Link from 'next/link';
import { ArrowLeft, Check, Info, Lightbulb, ScanLine, X } from 'lucide-react';
import type { Bin } from '@/types/bin';
import { BinIcon } from './BinIcon';

interface BinDetailsProps {
  bin: Bin;
  compact?: boolean;
  onScanAnother?: () => void;
  onClose?: () => void;
}

export function BinDetails({ bin, compact = false, onScanAnother, onClose }: BinDetailsProps) {
  return (
    <article className={`bin-details${compact ? ' bin-details-compact' : ''}`}>
      <div className="bin-detail-heading" style={{ '--bin-color': bin.color } as React.CSSProperties}>
        {!compact && <Link href="/" className="back-link"><ArrowLeft size={17} /> Volver</Link>}
        <div className="detail-hero">
          <span className="detail-icon"><BinIcon name={bin.icon} size={43} /></span>
          <span className="detail-tag"><span className="color-dot" /> Categoría de residuo</span>
          <h1>{bin.name}</h1>
          <p>{bin.description}</p>
        </div>
      </div>
      <div className="detail-body">
        <div className="decision-grid">
          <section className="decision-panel accepted" aria-labelledby="accepted-title">
            <h2 id="accepted-title"><span><Check size={17} /></span> SÍ puedes tirar</h2>
            <ul>{bin.acceptedItems.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <section className="decision-panel rejected" aria-labelledby="rejected-title">
            <h2 id="rejected-title"><span><X size={17} /></span> NO puedes tirar</h2>
            <ul>{bin.rejectedItems.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        </div>
        <section className="recommendations">
          <h2><Lightbulb size={19} /> Consejos para separar</h2>
          <ul>{bin.recommendations.map((tip) => <li key={tip}>{tip}</li>)}</ul>
        </section>
        <p className="local-note"><Info size={16} /> Estas recomendaciones son orientativas. La aceptación de materiales puede variar según el sistema de recolección local.</p>
        <div className="detail-actions">
          {!compact && <Link href={`/ar/bote/${bin.slug}`} className="button button-outline"><ScanLine size={18} /> Ver en realidad aumentada</Link>}
          {onScanAnother ? <button className="button button-primary" onClick={onScanAnother}>Escanear otro bote</button> : <Link href="/#escanear" className="button button-primary"><span>Escanear otro bote</span></Link>}
          {compact && onClose && <button className="button button-quiet" onClick={onClose}>Cerrar</button>}
        </div>
      </div>
    </article>
  );
}
