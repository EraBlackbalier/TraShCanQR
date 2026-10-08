// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ARFallback } from '@/components/ar/ARFallback';
import { ARTrackingStatus, type ARStatus } from '@/components/ar/ARTrackingStatus';

afterEach(cleanup);

describe('estados y alternativa de realidad aumentada', () => {
  it.each([
    ['loading', 'Preparando realidad aumentada…'],
    ['searching', 'Busca la etiqueta TraShCan'],
    ['detected', 'Etiqueta detectada · seguimiento activo'],
    ['lost', 'Etiqueta fuera de vista · vuelve a enfocarla'],
    ['paused', 'Cámara pausada mientras la pestaña está en segundo plano'],
    ['denied', 'Permiso de cámara denegado'],
    ['unsupported', 'Este dispositivo no ofrece una cámara compatible'],
    ['error', 'No pudimos iniciar el seguimiento'],
  ] as Array<[ARStatus, string]>)('comunica el estado %s', (status, message) => {
    render(<ARTrackingStatus status={status} />);
    expect(screen.getByRole('status').textContent).toContain(message);
  });

  it('mantiene un enlace a la ficha tradicional ante un fallo de cámara', () => {
    render(<ARFallback status="denied" slug="vidrio" onRetry={() => undefined} />);
    expect(screen.getByRole('alert').textContent).toContain('permite el acceso a la cámara');
    expect(screen.getByRole('link', { name: 'Ver ficha tradicional' }).getAttribute('href')).toBe('/bote/vidrio');
    expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeTruthy();
  });
});
