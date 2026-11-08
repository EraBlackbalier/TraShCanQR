// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBinBySlug } from '@/data/bins';
import { ARInformationPanel, type DetailsOpener } from './ARInformationPanel';

afterEach(cleanup);
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', ''); });
});

describe('panel AR por categoría', () => {
  it('usa ilustración y residuos de la misma categoría', () => {
    const bin = getBinBySlug('vidrio')!;
    let open: DetailsOpener | null = null;
    render(<ARInformationPanel bin={bin} onOpenReady={(handler) => { open = handler; }} />);
    act(() => { open?.(); });
    const panel = within(screen.getByRole('dialog')).getByRole('region', { name: 'Información AR: Vidrio' });
    expect(screen.getByRole('heading', { name: 'Vidrio' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Ilustración animada: botella de vidrio' })).toBeTruthy();
    expect(within(panel).getByText('Botellas de bebidas')).toBeTruthy();
    expect(within(panel).queryByText('Restos de frutas y verduras')).toBeNull();
  });

  it('cambia la lista por categoría de aceptación y rechazo', () => {
    const bin = getBinBySlug('plasticos')!;
    let open: DetailsOpener | null = null;
    render(<ARInformationPanel bin={bin} onOpenReady={(handler) => { open = handler; }} />);
    act(() => { open?.(); });
    const panel = within(screen.getByRole('dialog')).getByRole('region', { name: 'Información AR: Plásticos reciclables' });
    fireEvent.click(within(panel).getByRole('tab', { name: /EVITA/ }));
    expect(within(panel).getByText('NO DEPOSITES')).toBeTruthy();
    expect(within(panel).getByText('Plásticos con restos de comida o grasa')).toBeTruthy();
    expect(within(panel).queryByText('Botellas de bebidas')).toBeNull();
  });
});

it('amplía la misma tarjeta, conserva la pestaña y permite volver', () => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', ''); });
  let open: DetailsOpener | null = null;
  render(<ARInformationPanel bin={getBinBySlug('organicos')!} onOpenReady={(handler) => { open = handler; }} />);
  act(() => { open?.(); });
  const dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('tab', { name: /EVITA/ }));
  expect(within(dialog).getByText('NO DEPOSITES')).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('tab', { name: /SÍ PUEDES/ }));
  fireEvent.click(within(dialog).getByRole('button', { name: /Volver/ }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.queryByText('SÍ PUEDES DEPOSITAR')).toBeNull();
});


describe('acceso a la lectura AR con teclado', () => {
  it('devuelve el foco al botón que abrió la lectura', () => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', ''); });
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    let open: DetailsOpener | null = null;
    render(<ARInformationPanel bin={getBinBySlug('organicos')!} onOpenReady={(handler) => { open = handler; }} />);
    act(() => { open?.(trigger); });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: /Volver/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('no muestra un botón redundante dentro de la tarjeta ampliada', () => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', ''); });
    let open: DetailsOpener | null = null;
    render(<ARInformationPanel bin={getBinBySlug('organicos')!} onOpenReady={(handler) => { open = handler; }} />);
    act(() => { open?.(); });
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Ampliar tarjeta/ })).toBeNull();
  });
});
