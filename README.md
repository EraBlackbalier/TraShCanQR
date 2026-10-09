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

La ruta `/ar/bote/{slug}` carga `ARExperience` bajo demanda. Solo después de pulsar el botón se monta `ARScene`, solicita cámara trasera a MindAR y crea anclas visuales y CSS3D para cada índice del archivo compilado. `lib/ar/marker-config.ts` conserva el orden del catálogo que usa el compilador. Un panel HTML por objetivo muestra los datos de ese slug; eventos found/lost seleccionan un marcador activo y ocultan los demás. MindAR estima y actualiza la pose de la imagen, Three.js renderiza el aro en ese grupo y CSS3DRenderer proyecta el panel con la misma cámara, por lo que no es un overlay fijo. Al perder el marcador se oculta; al recuperar su imagen vuelve a seguirlo.

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

## Modo AR único y seguimiento

La interfaz de usuario usa exclusivamente realidad aumentada: las antiguas rutas `/bote/{slug}` redirigen a `/ar/bote/{slug}` y las tarjetas del inicio llevan al AR. El generador ofrece solo etiquetas AR; los QR ya impresos siguen siendo compatibles mediante la redirección.

El seguimiento depende de que la etiqueta permanezca reconocible dentro del campo visual. MindAR utiliza *image tracking*, no SLAM o anclas persistentes del mundo: si el marcador sale del encuadre, el panel se oculta hasta recuperarlo. Un panel fijo a la pantalla no se presenta como AR. Cada sesión crea únicamente el ancla de la categoría elegida y oculta el HTML CSS3D hasta el evento de detección.

## Escala y alineación del panel AR

El panel usa una escala CSS3D inicial de 4× respecto al objeto base y conserva su transformación de marcador. El usuario puede ajustarlo con los controles A+ y A− sin perder el seguimiento. Se evitó forzar al video de MindAR a cubrir el viewport con CSS porque MindAR calcula una posición y recorte específicos para alinear la cámara con el canvas WebGL y CSS3D. El panel permanece oculto sin marcador detectado.

Comprueba físicamente con Android e iOS: que la etiqueta y el anillo coincidan, que el panel se lea a 25–50 cm y que los controles de escala no desanclen el contenido.
