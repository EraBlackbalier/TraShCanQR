// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getBinBySlug } from '@/data/bins';
import { ARInformationPanel } from './ARInformationPanel';

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
