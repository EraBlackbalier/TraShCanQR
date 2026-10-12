import type { BinIcon } from '@/types/bin';

/** Gráficos SVG por categoría; modifica estas figuras/animaciones sin mover el ancla CSS3D de ARScene. */
export function BinIllustration({ kind }: { kind: BinIcon }) {
  return (
    <svg className={`ar-art ar-art-${kind}`} viewBox="0 0 220 190" role="img" aria-label={`Ilustración animada: ${illustrationNames[kind]}`}>
      <g className="ar-art-loop" aria-hidden="true">
        <path className="ar-art-loop-path" d="M40 142C12 83 43 25 104 23S196 60 185 111" />
        <path className="ar-art-loop-arrow" d="m177 104 8 10 10-8" />
      </g>
      <g className="ar-art-mini ar-art-mini-one" aria-hidden="true" transform="translate(35 35)">
        {kind === 'leaf' ? <path d="M0 20Q-2 0 22 0Q23 21 0 20Zm1-1L17 5" /> : kind === 'file' ? <path d="M0 0h16l7 7v23H0Zm16 0v8h7M5 15h13M5 21h13" /> : kind === 'zap' ? <path d="M13 0 0 18h11l-2 13 15-21H13Z" /> : kind === 'trash' ? <path d="M3 8h20l-2 24H5ZM0 5h26M8 0h10" /> : <path d="M8 0h9v8l6 7v17H2V15l6-7ZM6 20h13M9 3h7" />}
      </g>
      <g className="ar-art-mini ar-art-mini-two" aria-hidden="true" transform="translate(165 136)"><rect width="27" height="27" rx="8" /><path d="m6 14 5 5 10-12" /></g>
      <circle className="ar-art-orbit" cx="111" cy="94" r="72" />
      <circle className="ar-art-orbit ar-art-orbit-small" cx="111" cy="94" r="54" />
      {kind === 'leaf' && <>
        <path className="ar-art-stem" d="M111 143c1-27 4-47 23-71" />
        <path className="ar-art-leaf art-float" d="M132 80c-2-23 14-36 38-36 0 22-10 39-38 36Z" />
        <path className="ar-art-leaf art-float-delay" d="M109 107c-22 1-35-13-34-36 22 0 36 12 34 36Z" />
        <path className="ar-art-leaf ar-art-leaf-light art-bob" d="M111 143c-18 0-29-12-28-29 19 0 29 10 28 29Z" />
        <path className="ar-art-vein" d="m111 143 22-54m-24 20-20-31m21 57-18-16" />
        <circle className="ar-art-spark art-spark-one" cx="57" cy="72" r="4" /><circle className="ar-art-spark art-spark-two" cx="164" cy="128" r="3" />
      </>}
      {kind === 'bottle' && <>
        <g className="art-float"><path className="ar-art-container" d="M98 44h25v20l12 12v65a9 9 0 0 1-9 9h-31a9 9 0 0 1-9-9V76l12-12Z" />
          <path className="ar-art-highlight" d="M98 82v55m32-53v49" /><path className="ar-art-label" d="M89 98h49v24H89z" />
          <path className="ar-art-recycle" d="m108 105 5-7 5 7m-1 1 5 7h-8m-2-1-5 7-4-7" />
          <path className="ar-art-cap" d="M100 35h21v11h-21z" /></g>
        <circle className="ar-art-bubble art-bob" cx="61" cy="94" r="6" /><circle className="ar-art-bubble art-float-delay" cx="159" cy="68" r="4" /><circle className="ar-art-bubble art-float" cx="163" cy="131" r="3" />
      </>}
      {kind === 'file' && <>
        <g className="art-float"><path className="ar-art-paper" d="M76 48h47l23 23v72H76z" /><path className="ar-art-fold" d="M123 48v25h23" />
          <path className="ar-art-line" d="M90 89h41m-41 13h36m-36 13h40" />
        </g>
        <g className="ar-art-box art-float-delay"><path d="m48 123 26-14 26 14-26 15Z" /><path d="M48 123v27l26 15v-27Zm52 0v27l-26 15v-27Z" /><path className="ar-art-box-fold" d="m74 109 1 28m-27-14 26 15 26-15" /></g>
        <path className="ar-art-spark art-spark-one" d="M160 55v16m-8-8h16" />
      </>}
      {kind === 'glass' && <>
        <g className="art-float"><path className="ar-art-glass" d="M99 44h25v23l15 15v61a10 10 0 0 1-10 10H94a10 10 0 0 1-10-10V82l15-15Z" />
          <path className="ar-art-glass-shine" d="M98 81v52m8-73h9" /><path className="ar-art-glass-liquid" d="M87 111h47v32a8 8 0 0 1-8 8H95a8 8 0 0 1-8-8Z" /></g>
        <path className="ar-art-spark art-spark-one" d="M60 60v17m-8-8h17" /><path className="ar-art-spark art-spark-two" d="M159 106v12m-6-6h12" />
        <path className="ar-art-shard art-float-delay" d="m158 62 8 8-8 8-6-8Z" />
      </>}
      {kind === 'trash' && <>
        <g className="art-bob"><path className="ar-art-can" d="M80 70h61l-6 79a8 8 0 0 1-8 7H94a8 8 0 0 1-8-7Z" />
          <path className="ar-art-can-top" d="M73 61h75v12H73zm22-9h31" /><path className="ar-art-can-line" d="m98 86-2 47m27-47 2 47" /></g>
        <path className="ar-art-wisp art-float" d="M52 112c-12-14 6-24 15-17m87-17c10-11 23 1 18 10" />
        <circle className="ar-art-dot art-float-delay" cx="63" cy="143" r="5" /><circle className="ar-art-dot art-float" cx="164" cy="132" r="4" />
      </>}
      {kind === 'zap' && <>
        <g className="art-float"><rect className="ar-art-device" x="71" y="48" width="78" height="104" rx="14" />
          <rect className="ar-art-screen" x="79" y="60" width="62" height="72" rx="6" />
          <path className="ar-art-bolt" d="m116 70-17 28h14l-5 20 20-31h-15Z" />
          <circle className="ar-art-button" cx="110" cy="142" r="3" /></g>
        <path className="ar-art-circuit" d="M58 74h12m79 0h14M54 121h16m79 0h16M90 38v9m39 105v12" />
        <circle className="ar-art-spark art-spark-one" cx="60" cy="52" r="4" /><circle className="ar-art-spark art-spark-two" cx="166" cy="145" r="3" />
      </>}
    </svg>
  );
}

const illustrationNames: Record<BinIcon, string> = {
  leaf: 'hojas orgánicas', bottle: 'envase de plástico', file: 'papel y caja de cartón',
  glass: 'botella de vidrio', trash: 'bote de residuos generales', zap: 'dispositivo electrónico',
};
