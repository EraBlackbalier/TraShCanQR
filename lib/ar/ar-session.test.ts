import { describe, expect, it, vi } from 'vitest';
import { disposeARSession, type ARSessionLike } from '@/lib/ar/tracking';

describe('ciclo de vida AR', () => {
  it('detiene una sesión de forma idempotente, apaga cámara y libera WebGL', () => {
    const track = { stop: vi.fn() };
    const video = {
      srcObject: { getTracks: () => [track] },
      pause: vi.fn(),
      remove: vi.fn(),
    } as unknown as HTMLVideoElement;
    const rendererElement = { remove: vi.fn() } as unknown as HTMLElement;
    const cssElement = { remove: vi.fn() } as unknown as HTMLElement;
    const session: ARSessionLike = {
      stop: vi.fn(),
      controller: { dispose: vi.fn() },
      renderer: { dispose: vi.fn(), forceContextLoss: vi.fn(), domElement: rendererElement },
      cssRenderer: { domElement: cssElement },
      video,
    };

    disposeARSession(session);
    disposeARSession(session);

    expect(session.stop).toHaveBeenCalledOnce();
    expect(session.controller?.dispose).toHaveBeenCalledOnce();
    expect(session.renderer?.dispose).toHaveBeenCalledOnce();
    expect(session.renderer?.forceContextLoss).toHaveBeenCalledOnce();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(video.pause).toHaveBeenCalledOnce();
    expect(video.remove).toHaveBeenCalledOnce();
  });
});
