import { getBinBySlug } from '@/data/bins';

export type QrResolution =
  | { ok: true; binSlug: string }
  | { ok: false; reason: 'invalid' | 'unknown' | 'external' };

/** Acepta solo el slug interno definido o una URL de este sitio con ruta /bote/{slug}. */
export function resolveBinQr(rawValue: string, siteUrl?: string): QrResolution {
  const value = rawValue.trim();
  if (!value || value.length > 2048) return { ok: false, reason: 'invalid' };

  let slug: string;
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    slug = value;
  } else {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      return { ok: false, reason: 'invalid' };
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return { ok: false, reason: 'invalid' };
    if (!siteUrl) return { ok: false, reason: 'external' };
    let configured: URL;
    try {
      configured = new URL(siteUrl);
    } catch {
      return { ok: false, reason: 'invalid' };
    }
    if (parsed.origin !== configured.origin) return { ok: false, reason: 'external' };
    const match = parsed.pathname.match(/^\/bote\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/);
    if (!match || parsed.search || parsed.hash) return { ok: false, reason: 'invalid' };
    slug = match[1];
  }
  return getBinBySlug(slug) ? { ok: true, binSlug: slug } : { ok: false, reason: 'unknown' };
}

export function getPublicBaseUrl(currentOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return currentOrigin?.replace(/\/$/, '') ?? 'http://localhost:3000';
}

export function getBinUrl(slug: string, currentOrigin?: string): string {
  return `${getPublicBaseUrl(currentOrigin)}/bote/${encodeURIComponent(slug)}`;
}
