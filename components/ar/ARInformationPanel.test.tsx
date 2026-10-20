// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBinBySlug } from '@/data/bins';
import { ARInformationPanel } from './ARInformationPanel';

afterEach(cleanup);

describe('panel AR por categoría', () => {
  it('usa ilustración y residuos de la misma categoría', () => {
    const bin = getBinBySlug('vidrio')!;
    render(<ARInformationPanel bin={bin} />);
    expect(screen.getByRole('heading', { name: 'Vidrio' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Ilustración animada: botella de vidrio' })).toBeTruthy();
    const panel = screen.getByRole('region', { name: 'Información AR: Vidrio' });
    expect(within(panel).getByText('Botellas de bebidas')).toBeTruthy();
    expect(within(panel).queryByText('Restos de frutas y verduras')).toBeNull();
  });

  it('cambia la lista por categoría de aceptación y rechazo', () => {
    const bin = getBinBySlug('plasticos')!;
    render(<ARInformationPanel bin={bin} />);
    const panel = screen.getByRole('region', { name: 'Información AR: Plásticos reciclables' });
    fireEvent.click(within(panel).getByRole('tab', { name: /EVITA/ }));
    expect(within(panel).getByText('NO DEPOSITES')).toBeTruthy();
    expect(within(panel).getByText('Plásticos con restos de comida o grasa')).toBeTruthy();
    expect(within(panel).queryByText('Botellas de bebidas')).toBeNull();
  });
});

it('amplía la misma tarjeta, conserva la pestaña y permite volver', () => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', ''); });
  render(<ARInformationPanel bin={getBinBySlug('organicos')!} />);
  fireEvent.click(screen.getByRole('tab', { name: /EVITA/ }));
  fireEvent.click(screen.getByRole('region', { name: 'Información AR: Residuos orgánicos' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('NO DEPOSITES')).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('tab', { name: /SÍ PUEDES/ }));
  fireEvent.click(within(dialog).getByRole('button', { name: /Volver/ }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByText('SÍ PUEDES DEPOSITAR')).toBeTruthy();
});


describe('acceso a la lectura AR con teclado', () => {
  it('permite ampliar con Enter y devuelve el foco al cerrar', () => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', ''); });
    render(<ARInformationPanel bin={getBinBySlug('organicos')!} />);
    const card = screen.getByRole('region', { name: 'Información AR: Residuos orgánicos' });
    card.focus();
    fireEvent.keyDown(card, { key: 'Enter' });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: /Volver/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(card);
  });

  it('permite ampliar con Espacio sin reintroducir el botón redundante', () => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', ''); });
    render(<ARInformationPanel bin={getBinBySlug('organicos')!} />);
    const card = screen.getByRole('region', { name: 'Información AR: Residuos orgánicos' });
    fireEvent.keyDown(card, { key: ' ' });
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Ampliar tarjeta/ })).toBeNull();
  });
});
