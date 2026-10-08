// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { IScannerControls } from '@zxing/browser';
import { Scanner } from '@/components/scanner/Scanner';
import { BinDetails } from '@/components/bins/BinDetails';
import { bins } from '@/data/bins';

const { decodeFromVideoDevice, decodeFromConstraints } = vi.hoisted(() => ({
  decodeFromVideoDevice: vi.fn(),
  decodeFromConstraints: vi.fn(),
}));

vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: class {
    decodeFromVideoDevice(...args: Parameters<typeof decodeFromVideoDevice>) { return decodeFromVideoDevice(...args); }
    decodeFromConstraints(...args: Parameters<typeof decodeFromConstraints>) { return decodeFromConstraints(...args); }
  },
}));

describe('Scanner', () => {
  beforeEach(() => {
    decodeFromVideoDevice.mockReset();
    decodeFromConstraints.mockReset();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn() } });
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('mantiene el video montado, detiene cada sesión y permite escanear dos botes seguidos', async () => {
    const firstControls = { stop: vi.fn() } satisfies IScannerControls;
    const secondControls = { stop: vi.fn() } satisfies IScannerControls;
    decodeFromVideoDevice.mockResolvedValueOnce(firstControls).mockResolvedValueOnce(secondControls);
    const onClose = vi.fn();
    render(<Scanner onClose={onClose} />);

    await waitFor(() => expect(decodeFromVideoDevice).toHaveBeenCalledTimes(1));
    const firstCall = decodeFromVideoDevice.mock.calls[0];
    const video = firstCall[1] as HTMLVideoElement;
    expect(firstCall[0]).toBeUndefined();
    expect(video.isConnected).toBe(true);
    const cameraTrack = { stop: vi.fn() };
    Object.defineProperty(video, 'srcObject', { configurable: true, writable: true, value: { getTracks: () => [cameraTrack] } });
    (firstCall[2] as (result: { getText(): string }, error: undefined, controls: IScannerControls) => void)(
      { getText: () => `${window.location.origin}/bote/organicos` }, undefined, firstControls,
    );
    expect(await screen.findByRole('heading', { name: 'Residuos orgánicos' })).toBeTruthy();
    expect(firstControls.stop).toHaveBeenCalledOnce();
    expect(cameraTrack.stop).toHaveBeenCalledOnce();
    expect(video.isConnected).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Escanear otro bote' }));
    await waitFor(() => expect(decodeFromVideoDevice).toHaveBeenCalledTimes(2));
    const secondCall = decodeFromVideoDevice.mock.calls[1];
    expect(secondCall[1]).toBe(video);
    (secondCall[2] as (result: { getText(): string }, error: undefined, controls: IScannerControls) => void)(
      { getText: () => `${window.location.origin}/bote/vidrio` }, undefined, secondControls,
    );
    expect(await screen.findByRole('heading', { name: 'Vidrio' })).toBeTruthy();
    expect(secondControls.stop).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: /^Cerrar$/ }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(decodeFromVideoDevice).toHaveBeenCalledTimes(2);
  });

  it('muestra un mensaje claro para un QR de una categoría desconocida', async () => {
    const controls = { stop: vi.fn() } satisfies IScannerControls;
    decodeFromVideoDevice.mockResolvedValueOnce(controls);
    render(<Scanner onClose={vi.fn()} />);
    await waitFor(() => expect(decodeFromVideoDevice).toHaveBeenCalledOnce());
    const callback = decodeFromVideoDevice.mock.calls[0][2] as (result: { getText(): string }, error: undefined, controls: IScannerControls) => void;
    callback({ getText: () => `${window.location.origin}/bote/categoria-inexistente` }, undefined, controls);
    expect(await screen.findByText(/todavía no está disponible/i)).toBeTruthy();
    expect(controls.stop).toHaveBeenCalledOnce();
  });

  it('cierra con Escape y libera la pista de cámara activa', async () => {
    const controls = { stop: vi.fn() } satisfies IScannerControls;
    const track = { stop: vi.fn() };
    decodeFromVideoDevice.mockResolvedValueOnce(controls);
    const onClose = vi.fn();
    const { unmount } = render(<Scanner onClose={onClose} />);
    await waitFor(() => expect(decodeFromVideoDevice).toHaveBeenCalledOnce());
    const video = decodeFromVideoDevice.mock.calls[0][1] as HTMLVideoElement;
    Object.defineProperty(video, 'srcObject', { configurable: true, writable: true, value: { getTracks: () => [track] } });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
    expect(controls.stop).toHaveBeenCalledOnce();
    expect(track.stop).toHaveBeenCalledOnce();
  });

  it('muestra el estado de permiso rechazado sin intentar abrir otra cámara', async () => {
    decodeFromVideoDevice.mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'));
    render(<Scanner onClose={vi.fn()} />);
    expect(await screen.findByText('Permiso de cámara denegado')).toBeTruthy();
    expect(decodeFromConstraints).not.toHaveBeenCalled();
  });

  it('informa si el navegador no ofrece una cámara', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    render(<Scanner onClose={vi.fn()} />);
    expect(await screen.findByText('No encontramos una cámara')).toBeTruthy();
    expect(decodeFromVideoDevice).not.toHaveBeenCalled();
  });

  it('usa una cámara alternativa si la restricción de cámara trasera no está disponible', async () => {
    const controls = { stop: vi.fn() } satisfies IScannerControls;
    decodeFromVideoDevice.mockRejectedValueOnce(new DOMException('Unavailable', 'OverconstrainedError'));
    decodeFromConstraints.mockResolvedValueOnce(controls);
    render(<Scanner onClose={vi.fn()} />);
    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalledOnce());
    expect(decodeFromConstraints.mock.calls[0][0]).toEqual({ video: true });
    expect(await screen.findByText('Mantén el código dentro del recuadro')).toBeTruthy();
  });

  it('detiene una sesión cuando el modal se desmonta antes de recibir el resultado', async () => {
    const controls = { stop: vi.fn() } satisfies IScannerControls;
    let resolveStart!: (controls: IScannerControls) => void;
    decodeFromVideoDevice.mockReturnValueOnce(new Promise<IScannerControls>((resolve) => { resolveStart = resolve; }));
    const { unmount } = render(<Scanner onClose={vi.fn()} />);
    await waitFor(() => expect(decodeFromVideoDevice).toHaveBeenCalledOnce());
    unmount();
    resolveStart(controls);
    await waitFor(() => expect(controls.stop).toHaveBeenCalledOnce());
  });
});

describe('BinDetails callbacks', () => {
  it('asigna el botón de reescaneo y el botón cerrar a acciones independientes', () => {
    const onScanAnother = vi.fn();
    const onClose = vi.fn();
    render(<BinDetails bin={bins[0]} compact onScanAnother={onScanAnother} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Escanear otro bote' }));
    expect(onScanAnother).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Cerrar$/ }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onScanAnother).toHaveBeenCalledOnce();
  });
});
