import { describe, expect, it } from 'vitest';
import { bins, getBinBySlug } from '@/data/bins';
import { getBinUrl, getPublicBaseUrl, resolveBinQr } from '@/lib/qr';

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
    expect(resolveBinQr('https://trashcan.example.evil.test/bote/organicos', site)).toEqual({ ok: false, reason: 'external' });
  });

  it('rechaza URLs malformadas, con query o fragmento', () => {
    expect(resolveBinQr('https://[malformed.test/bote/organicos', site)).toEqual({ ok: false, reason: 'invalid' });
    expect(resolveBinQr(`${site}/bote/organicos?next=https://evil.test`, site)).toEqual({ ok: false, reason: 'invalid' });
    expect(resolveBinQr(`${site}/bote/organicos#section`, site)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('construye una URL absoluta del bote', () => {
    expect(getBinUrl('organicos', site)).toBe(`${site}/bote/organicos`);
  });

  it('usa el origen actual cuando no hay dominio configurado, igual que el generador', () => {
    const localOrigin = 'http://192.168.1.20:3000';
    const allowedOrigin = getPublicBaseUrl(localOrigin, '');
    const generatedUrl = getBinUrl('organicos', localOrigin, '');
    expect(generatedUrl).toBe(`${localOrigin}/bote/organicos`);
    expect(resolveBinQr(generatedUrl, allowedOrigin)).toEqual({ ok: true, binSlug: 'organicos' });
  });

  it('prefiere la URL pública configurada y normaliza la ruta final', () => {
    expect(getPublicBaseUrl('http://localhost:3000', 'https://trashcan.example/')).toBe(site);
    expect(getBinUrl('vidrio', 'http://localhost:3000', 'https://trashcan.example/')).toBe(`${site}/bote/vidrio`);
  });
});
