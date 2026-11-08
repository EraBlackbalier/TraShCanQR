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
  it('permite acercar y alejar el modelo sin cambiar de página', () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    render(<ARControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} onOpenDetails={vi.fn()} canOpenDetails />);
    fireEvent.click(screen.getByRole('button', { name: 'Acercar modelo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Alejar modelo' }));
    expect(onZoomIn).toHaveBeenCalledOnce();
    expect(onZoomOut).toHaveBeenCalledOnce();
  });

  it('detiene la repetición automática al cerrar la experiencia AR', () => {
    vi.useFakeTimers();
    const onZoomIn = vi.fn();
    const { unmount } = render(<ARControls onZoomIn={onZoomIn} onZoomOut={vi.fn()} onOpenDetails={vi.fn()} canOpenDetails />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Acercar modelo' }));
    act(() => { vi.advanceTimersByTime(330); });
    expect(onZoomIn).toHaveBeenCalledOnce();
    unmount();
    act(() => { vi.advanceTimersByTime(500); });
    expect(onZoomIn).toHaveBeenCalledOnce();
  });

  it('abre la información desde el botón de detalles', () => {
    const onOpenDetails = vi.fn();
    render(<ARControls onZoomIn={vi.fn()} onZoomOut={vi.fn()} onOpenDetails={onOpenDetails} canOpenDetails />);
    fireEvent.click(screen.getByRole('button', { name: 'Averiguar más info' }));
    expect(onOpenDetails).toHaveBeenCalledWith(expect.any(HTMLElement));
  });
});
