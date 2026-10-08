# TraShCanQR

TraShCan es una guía web mobile-first para consultar qué residuos corresponden a cada bote. Se puede abrir la ficha desde un QR con la cámara normal del teléfono o usar el escáner integrado. El catálogo y la validación se ejecutan localmente en el navegador; no hay backend, cuentas, analítica ni envío de imágenes de cámara.

Las recomendaciones incluidas son ejemplos editables. Las reglas reales dependen del servicio de recolección de cada localidad.

## Requisitos

- Node.js 20 o posterior
- npm

## Instalación y ejecución local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`. También están disponibles `npm run typecheck`, `npm run lint`, `npm test` y `npm run build`.

## Dominio de los QR

Copia `.env.example` a `.env.local` y define el dominio que deben guardar los códigos:

```env
NEXT_PUBLIC_SITE_URL=https://tu-dominio.example
```

En desarrollo puedes usar una dirección accesible desde otros dispositivos en la misma red, por ejemplo `http://192.168.1.25:3000`. Arranca el servidor escuchando en la red con `npm run dev -- --hostname 0.0.0.0` y configura en `.env.local` la IP local de tu computadora. Reinicia Next.js después de cambiar variables de entorno. El acceso a cámara requiere HTTPS o localhost; para probar desde un teléfono, usa una URL HTTPS de desarrollo o un túnel HTTPS de tu elección.

Cuando no se define `NEXT_PUBLIC_SITE_URL`, el generador usa el origen actual del navegador, lo cual facilita probarlo en una red local. En producción configura siempre el dominio público.

## Probar desde un teléfono

1. Conecta la computadora y el teléfono a la misma red.
2. Configura `NEXT_PUBLIC_SITE_URL` con la IP local y ejecuta `npm run dev -- --hostname 0.0.0.0`.
3. Abre esa dirección en el teléfono. Para que el navegador permita usar la cámara, utiliza HTTPS o una URL local segura; la cámara nativa puede abrir también el QR de un despliegue público.
4. En la página inicial toca **Escanear código QR** y permite la cámara. También puedes entrar a `/generar-qr`, seleccionar un bote y probar el QR generado.

El escáner integrado solo procesa slugs conocidos o enlaces `/bote/{slug}` del dominio configurado. Nunca abre direcciones arbitrarias que aparezcan en un QR.

## Agregar categorías

Agrega un objeto `Bin` al arreglo de `data/bins.ts`, con un `id` único, un `slug` de URL único, `name`, `description`, `color`, `icon`, listas de aceptación y rechazo, recomendaciones y ejemplos. Los iconos disponibles son `leaf`, `bottle`, `file`, `glass`, `trash` y `zap`; para sumar un icono nuevo, amplía `BinIcon` en `types/bin.ts` y el mapa en `components/bins/BinIcon.tsx`. Las tarjetas, fichas, enlaces y el generador se alimentan del mismo catálogo.

## Generar e imprimir QR

Abre `/generar-qr`, selecciona una categoría y confirma la dirección. **Descargar PNG** guarda un QR de alta resolución. **Imprimir** genera una página sencilla con el nombre y el código del bote. Cada QR apunta a `NEXT_PUBLIC_SITE_URL/bote/{slug}`.

## Despliegue en Vercel

Importa el repositorio en Vercel y configura `NEXT_PUBLIC_SITE_URL` con el dominio final en las variables de entorno del proyecto. Despliega con la configuración predeterminada de Next.js. No se requieren servicios adicionales. Después del despliegue prueba una ficha compartible, el escáner en HTTPS y un QR descargado desde un teléfono.
