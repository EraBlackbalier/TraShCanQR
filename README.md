# TraShCanQR · TraShCan WebAR

TraShCan es una guía mobile-first para separar residuos. Además de abrir fichas desde el QR o el lector integrado, permite apuntar a una etiqueta TraShCan impresa y ver paneles HTML y elementos Three.js anclados a su pose usando seguimiento visual MindAR. La detección ocurre localmente en el navegador; no hay backend, cuentas, analítica ni envío de video.

Las recomendaciones incluidas son ejemplos editables. Las reglas reales dependen del servicio de recolección de cada localidad.

## Requisitos e instalación

- Node.js 20 o posterior (Node 24 recomendado para compilar marcadores)
- npm

```bash
npm ci
npm run dev
```

Abre `http://localhost:3000`. Validaciones: `npm run typecheck`, `npm run lint`, `npm test` y `npm run build`.

## Dominio de QR y prueba local

Copia `.env.example` a `.env.local` y define:

```env
NEXT_PUBLIC_SITE_URL=https://trashcan.eradimension.dev
```

Para que otro equipo de la red abra el enlace QR, puedes configurar la IP local, por ejemplo `http://192.168.1.25:3000`, y ejecutar `npm run dev -- --hostname 0.0.0.0`. Reinicia Next.js al modificar variables. La cámara del navegador requiere HTTPS o localhost. Para probar físicamente desde el teléfono en desarrollo usa una URL HTTPS (por ejemplo un túnel de desarrollo); un hostname/IP HTTP local no suele habilitar cámara.

El escáner procesa solo slugs conocidos o URLs internas `/bote/{slug}` del dominio configurado. No visita URLs arbitrarias. La cámara se solicita tras una acción explícita; el QR nativo abre la ficha sin pedir permiso de cámara a la aplicación.

## Arquitectura AR

La ruta `/ar/bote/{slug}` carga `ARExperience` bajo demanda. Solo después de pulsar el botón se monta `ARScene` y MindAR solicita la cámara. `lib/ar/marker-config.ts` conserva el orden del catálogo y deriva la pose del QR de la geometría compartida en `lib/ar/label-geometry.ts`: el punto se ancla al centro del QR y el panel se centra justo encima, con un margen de 12 px. Cada tarjeta CSS3D usa la pose que MindAR estima para su etiqueta; un solo marcador activo determina qué panel aparece. La escala solo se ajusta a los límites del viewport, manteniendo su ancla en el marcador. Si cambia la ubicación/tamaño impreso del QR, actualiza la geometría compartida y sus pruebas. Los materiales se animan dentro de la tarjeta y se respeta movimiento reducido.

Las seis etiquetas finales están versionadas en `public/ar/labels/` como PNG imprimible (1000×1320) y SVG. `public/ar/targets/trashcan-labels.mind` se compiló con MindAR OfflineCompiler desde esos PNG exactos y los QR integrados; se sirve localmente, sin recursos de reconocimiento externos. Imprime la etiqueta completa, sin recortar ni sustituir patrones. En `/generar-qr` selecciona «Etiqueta con marcador AR» para descargar o imprimir.

Para regenerar artefactos, ejecuta `npm run ar:labels`. El script usa `@napi-rs/canvas` como implementación compatible del `canvas` opcional que el compilador offline de MindAR requiere en Node 24. El orden de `bins` debe coincidir con el orden de imágenes. Define `NEXT_PUBLIC_SITE_URL` antes de compilar para incrustar enlaces QR del dominio deseado; el recurso versionado usa `https://trashcan.eradimension.dev` por defecto.

## Agregar categorías

Agrega un objeto `Bin` a `data/bins.ts` con id y slug únicos, nombre, descripción, color, icono, listas de aceptación/rechazo, recomendaciones y ejemplos. Las tarjetas, fichas, enlaces, paneles AR y generador leen el mismo catálogo. Agrega el PNG/SVG de la nueva etiqueta regenerando los recursos con `npm run ar:labels`. Los iconos disponibles son `leaf`, `bottle`, `file`, `glass`, `trash` y `zap`; para un icono nuevo amplía `BinIcon`.

## Generar e imprimir

En `/generar-qr` elige QR tradicional o etiqueta AR, categoría y dirección. El QR tradicional conserva la ruta existente `NEXT_PUBLIC_SITE_URL/bote/{slug}`. El formato AR incorpora esa misma URL en la etiqueta con marcador visual, color, nombre y guía de seguimiento.

## Verificación física y compatibilidad

1. Imprime una etiqueta AR en papel mate, completa y con buena calidad.
2. Abre su QR nativo para llegar a `/bote/{slug}`.
3. Pulsa **Ver en realidad aumentada**, concede permiso y apunta a toda la etiqueta a unos 25–50 cm bajo luz uniforme.
4. Mueve el teléfono de lado, acércate/aléjate y gira ligeramente; el punto debe coincidir con el centro del QR y el panel debe seguirlo, creciendo al acercarte y reduciéndose al alejarte. Pulsa la tarjeta para ampliar su lectura y usa «Volver a la cámara» para regresar.
5. Sácala del encuadre y vuelve a apuntarla para comprobar pérdida y recuperación.
6. Sal de AR y verifica que el indicador de cámara desaparezca.

La verificación automatizada no sustituye esta prueba física. Safari iOS y Chrome Android dependen de WebGL, CSS3D y permisos de cámara del navegador. La etiqueta debe estar plana, completa, nítida y sin reflejos. Ante rechazo o fallo, la ficha convencional sigue disponible.

## Despliegue en Vercel

Conserva el proyecto existente `trashcan` y el dominio `trashcan.eradimension.dev`. Configura `NEXT_PUBLIC_SITE_URL=https://trashcan.eradimension.dev` en los entornos Vercel correspondientes y despliega con la configuración predeterminada de Next.js. Los targets y etiquetas son recursos estáticos locales; no hace falta backend ni servicio de reconocimiento. Tras desplegar prueba ficha compartible, una etiqueta QR y la prueba física completa.

## Paneles y marcadores actualizados

El panel visible se renderiza en un grupo CSS3D hermano del ancla detectora. El probe oculto conserva la notificación de MindAR; el grupo visible copia la matriz real del marcador durante cada actualización válida. Al perder el target, conserva la última pose durante su animación de salida de 240 ms y se oculta al terminar `animationend`; al recuperarlo retoma la matriz. Una sola categoría queda seleccionada, los callbacks se validan contra la generación de sesión y el reductor ignora slugs que no están en el catálogo.

Las tarjetas llevan ilustraciones SVG animadas de las seis categorías y el catálogo sigue siendo su única fuente de texto. Las animaciones empiezan con el tracking válido y se detienen con `prefers-reduced-motion`. `npm run ar:labels` produce las etiquetas SVG/PNG, una hoja A4 `public/ar/labels/hoja-etiquetas.pdf` y el `.mind` de los seis PNG en el orden del catálogo. El QR sigue apuntando a `/bote/{slug}`; conserva la zona silenciosa para escaneo y el marco QR ocupa la misma posición de referencia usada para anclar el panel.

El video conserva el tamaño y los offsets que calcula `MindAR.resize()`; el CSS no los reemplaza por un recorte adicional. El punto del QR y la tarjeta comparten la misma matriz CSS3D. El punto usa el centro del código en la etiqueta impresa, y la tarjeta queda 12 píxeles del target por encima del QR, a una profundidad normalizada de 0.002. Su tamaño se obtiene de la perspectiva del marcador y solo se limita cuando excede el 84% del ancho o el 44% del alto de pantalla. El filtro adaptativo de MindAR 1.2.5 conserva sus valores por defecto.

La comprobación con un video generado de una etiqueta orgánica, procesado por MindAR en Chromium, midió un error del punto inferior a 2 píxeles en cinco escenarios: tamaño inicial, acercamiento, alejamiento, traslación/giro y orientación horizontal. Esta comprobación no utiliza cámara física y no sustituye la prueba en teléfonos.


## Guía rápida para modificar la experiencia AR

- **Cámara, seguimiento, punto del QR y escala automática:** `components/ar/ARScene.tsx`. Aquí conecta el estado de tracking y la pose; no pongas el panel en una posición fija de pantalla.
- **Posición del QR impreso y ancla del panel:** `lib/ar/label-geometry.ts` y `lib/ar/marker-config.ts`. Sus coordenadas deben corresponder a `scripts/generate-ar-labels.mjs`.
- **Diseño de la tarjeta, pestañas y contenido visible:** `components/ar/ARInformationPanel.tsx`. Solo presenta el `Bin` que recibe; las reglas se editan en `data/bins.ts`.
- **Dibujos y animaciones interiores:** `components/ar/BinIllustration.tsx` y los selectores `ar-art-*` en `app/globals.css`. Mantén las animaciones dentro del arte para que no se mueva el marco anclado.
- **Botones flotantes de cámara/zoom:** `components/ar/ARControls.tsx`; sus acciones y su estado de tracking se conectan desde `ARScene.tsx`.
- **Pruebas de pose, escala y posición del QR:** `lib/ar/marker-config.test.ts` y `lib/ar/panel-anchor.test.ts`. Para probar cámara real sigue la sección «Verificación física y compatibilidad».
