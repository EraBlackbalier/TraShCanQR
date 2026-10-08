import { describe, expect, it } from 'vitest';
import { bins, getBinBySlug } from '@/data/bins';
import { getBinUrl, resolveBinQr } from '@/lib/qr';

const site = 'https://trashcan.example';

describe('catálogo de botes', () => {
  it('incluye las seis categorías de demostración', () => {
    expect(bins).toHaveLength(6);
    expect(getBinBySlug('organicos')?.name).toBe('Residuos orgánicos');
  });

  it('resuelve un enlace público del dominio configurado', () => {
    expect(resolveBinQr(`${site}/bote/papel-carton`, site)).toEqual({ ok: true, binSlug: 'papel-carton' });
  });

  it('acepta slugs conocidos y rechaza identificadores desconocidos', () => {
    expect(resolveBinQr('vidrio')).toEqual({ ok: true, binSlug: 'vidrio' });
    expect(resolveBinQr('armario')).toEqual({ ok: false, reason: 'unknown' });
  });

  it('no admite dominios externos ni rutas arbitrarias', () => {
    expect(resolveBinQr('https://evil.example/bote/organicos', site)).toEqual({ ok: false, reason: 'external' });
    expect(resolveBinQr(`${site}/otro/organicos`, site)).toEqual({ ok: false, reason: 'invalid' });
    expect(resolveBinQr('javascript:alert(1)', site)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('construye una URL absoluta del bote', () => {
    expect(getBinUrl('organicos', site)).toBe(`${site}/bote/organicos`);
  });
});
