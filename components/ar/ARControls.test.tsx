// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ARControls } from './ARControls';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Controles de zoom AR', () => {
  it('permite acercar y alejar la tarjeta sin cambiar de página', () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    render(<ARControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} />);
    fireEvent.click(screen.getByRole('button', { name: 'Acercar tarjeta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Alejar tarjeta' }));
    expect(onZoomIn).toHaveBeenCalledOnce();
    expect(onZoomOut).toHaveBeenCalledOnce();
  });

  it('detiene la repetición automática al cerrar la experiencia AR', () => {
    vi.useFakeTimers();
    const onZoomIn = vi.fn();
    const { unmount } = render(<ARControls onZoomIn={onZoomIn} onZoomOut={vi.fn()} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Acercar tarjeta' }));
    act(() => { vi.advanceTimersByTime(330); });
    expect(onZoomIn).toHaveBeenCalledOnce();
    unmount();
    act(() => { vi.advanceTimersByTime(500); });
    expect(onZoomIn).toHaveBeenCalledOnce();
  });
});
