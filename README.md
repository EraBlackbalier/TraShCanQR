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

La ruta `/ar/bote/{slug}` carga `ARExperience` bajo demanda. Solo después de pulsar el botón se monta `ARScene`, solicita cámara trasera a MindAR y crea anclas visuales y CSS3D para cada índice del archivo compilado. `lib/ar/marker-config.ts` conserva el orden del catálogo y calibra la pose del panel a partir de la geometría de la etiqueta: su marco de 600×300 px termina 18 px antes del borde superior del QR, y se centra horizontalmente sobre él. El objeto conserva esa escala y pose en unidades del marcador; no se reposiciona con coordenadas de pantalla. Si cambia el tamaño o la posición impresa del QR en `scripts/generate-ar-labels.mjs`, actualiza también esa geometría centralizada. Un panel HTML por objetivo muestra los datos de ese slug; eventos found/lost seleccionan un marcador activo y ocultan los demás. MindAR estima y actualiza la pose de la imagen, Three.js renderiza el aro en ese grupo y CSS3DRenderer proyecta el panel con la misma cámara, por lo que no es un overlay fijo. Al detectarlo aparece suavemente, los materiales entran escalonados al alternar pestañas, y al perder el marcador vuelve al estado oculto. Se respetan preferencias de movimiento reducido.

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
4. Mueve el teléfono de lado, acércate/aléjate y gira ligeramente; el panel y aro deben seguir la etiqueta.
5. Sácala del encuadre y vuelve a apuntarla para comprobar pérdida y recuperación.
6. Sal de AR y verifica que el indicador de cámara desaparezca.

La verificación automatizada no sustituye esta prueba física. Safari iOS y Chrome Android dependen de WebGL, CSS3D y permisos de cámara del navegador. La etiqueta debe estar plana, completa, nítida y sin reflejos. Ante rechazo o fallo, la ficha convencional sigue disponible.

## Despliegue en Vercel

Conserva el proyecto existente `trashcan` y el dominio `trashcan.eradimension.dev`. Configura `NEXT_PUBLIC_SITE_URL=https://trashcan.eradimension.dev` en los entornos Vercel correspondientes y despliega con la configuración predeterminada de Next.js. Los targets y etiquetas son recursos estáticos locales; no hace falta backend ni servicio de reconocimiento. Tras desplegar prueba ficha compartible, una etiqueta QR y la prueba física completa.

## Paneles y marcadores actualizados

El panel visible se renderiza en un grupo CSS3D hermano del ancla detectora. El probe oculto conserva la notificación de MindAR; el grupo visible copia la matriz real del marcador durante cada actualización válida. Al perder el target, conserva la última pose durante su animación de salida de 240 ms y se oculta al terminar `animationend`; al recuperarlo retoma la matriz. Una sola categoría queda seleccionada, los callbacks se validan contra la generación de sesión y el reductor ignora slugs que no están en el catálogo.

Las tarjetas llevan ilustraciones SVG animadas de las seis categorías y el catálogo sigue siendo su única fuente de texto. Las animaciones empiezan con el tracking válido y se detienen con `prefers-reduced-motion`. `npm run ar:labels` produce las etiquetas SVG/PNG, una hoja A4 `public/ar/labels/hoja-etiquetas.pdf` y el `.mind` de los seis PNG en el orden del catálogo. El QR sigue apuntando a `/bote/{slug}`; conserva la zona silenciosa para escaneo y el marco QR ocupa la misma posición de referencia usada para anclar el panel.
