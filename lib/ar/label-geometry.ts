/**
 * Geometría común a la etiqueta impresa y al anclaje AR.
 * Si mueves o cambias el tamaño del QR en scripts/generate-ar-labels.mjs,
 * actualiza aquí qrX/qrY/qrSize y panelGap; marker-config deriva de estos valores.
 * No ajustes el punto en ARScene con coordenadas de pantalla.
 */
export const markerLabelGeometry = {
  width: 1000,
  height: 1320,
  qrCardLeft: 245,
  qrCardTop: 800,
  qrCardSize: 510,
  qrX: 304,
  qrY: 852,
  qrSize: 392,
  qrQuietZone: 4,
  panelWidth: 600,
  panelHeight: 300,
  panelScale: 1.2,
  panelGap: 12,
  panelDepth: 0.002,
} as const;
