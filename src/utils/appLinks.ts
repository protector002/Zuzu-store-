import { StoreApp, BuyerReceipt } from '../types';
import { getPhoneRelease, getTvRelease, isTvApp } from './editionHelper';

export interface ParsedAppRoute {
  appIdentifier: string | null;
  edition?: 'phone' | 'tv';
  isTvHub: boolean;
  receiptSaleId?: string | null;
  receiptToken?: string | null;
}

/**
 * Convert an app name or raw slug into a clean URL-safe slug segment.
 */
export function toUrlSlug(input: string): string {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/**
 * Compute the base readable slug for a StoreApp.
 */
export function getBaseAppSlug(app: StoreApp): string {
  const fromSlug = toUrlSlug(app.slug);
  if (fromSlug) return fromSlug;
  const fromName = toUrlSlug(app.name);
  if (fromName) return fromName;
  return toUrlSlug(app.id) || 'app';
}

/**
 * Derive an unambiguous canonical slug for an app.
 * Uses clean `/app/<slug>` whenever unique across the catalog, and automatically
 * appends `--<app.id>` only when two apps collide on the same base slug
 * (e.g., separate phone/TV listings or identically named developer packages).
 */
export function getCanonicalAppSlug(app: StoreApp, allApps: StoreApp[] = []): string {
  const baseSlug = getBaseAppSlug(app);
  const hasCollision = allApps.some(
    (other) => other && other.id !== app.id && getBaseAppSlug(other) === baseSlug
  );
  if (hasCollision) {
    return `${baseSlug}--${app.id}`;
  }
  return baseSlug;
}

/**
 * Build the relative storefront route path for sharing or history state.
 */
export function getAppPath(
  app: StoreApp,
  allApps: StoreApp[] = [],
  edition?: 'phone' | 'tv'
): string {
  const slug = getCanonicalAppSlug(app, allApps);
  const tvRel = getTvRelease(app);
  const phoneRel = getPhoneRelease(app);
  const hasBothEditions = Boolean(tvRel && phoneRel && tvRel.id !== phoneRel.id);
  const includeTvQuery = edition === 'tv' && (hasBothEditions || isTvApp(app));
  return `/app/${encodeURIComponent(slug)}${includeTvQuery ? '?edition=tv' : ''}`;
}

/**
 * Build the full canonical shareable URL for a StoreApp.
 */
export function getAppShareUrl(
  app: StoreApp,
  allApps: StoreApp[] = [],
  edition?: 'phone' | 'tv'
): string {
  const path = getAppPath(app, allApps, edition);
  if (typeof window === 'undefined' || !window.location?.origin) {
    return path;
  }
  return `${window.location.origin}${path}`;
}

/**
 * Parse `/app/:identifier[?edition=tv]` or `/tv` from a browser pathname + search string.
 */
export function parseAppRouteFromLocation(
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : '/',
  search: string = typeof window !== 'undefined' ? window.location.search : ''
): ParsedAppRoute {
  const cleanPath = String(pathname || '/').replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(search || '');
  const rawEdition = params.get('edition')?.toLowerCase();
  const edition: 'phone' | 'tv' | undefined =
    rawEdition === 'tv' ? 'tv' : rawEdition === 'phone' ? 'phone' : undefined;

  const receiptMatch = cleanPath.match(/^\/receipt\/([^/]+)$/i);
  if (receiptMatch && receiptMatch[1]) {
    let decodedSaleId = receiptMatch[1];
    try {
      decodedSaleId = decodeURIComponent(receiptMatch[1]);
    } catch (_) {}
    return {
      appIdentifier: null,
      edition,
      isTvHub: false,
      receiptSaleId: decodedSaleId.trim() || null,
      receiptToken: params.get('token')?.trim() || null
    };
  }

  const match = cleanPath.match(/^\/app\/([^/]+)$/i);
  if (match && match[1]) {
    let decoded = match[1];
    try {
      decoded = decodeURIComponent(match[1]);
    } catch (_) {}
    return {
      appIdentifier: decoded.trim() || null,
      edition,
      isTvHub: false,
      receiptSaleId: null,
      receiptToken: null
    };
  }

  return {
    appIdentifier: null,
    edition,
    isTvHub: cleanPath.toLowerCase() === '/tv',
    receiptSaleId: null,
    receiptToken: null
  };
}

const LOCAL_RECEIPTS_KEY = 'zuzustore_saved_receipts_v1';

export function getReceiptPath(saleId: string, downloadToken?: string): string {
  const cleanId = encodeURIComponent(String(saleId || '').trim());
  const tokenQuery = downloadToken ? `?token=${encodeURIComponent(downloadToken)}` : '';
  return `/receipt/${cleanId}${tokenQuery}`;
}

export function getReceiptShareUrl(saleId: string, downloadToken?: string): string {
  const path = getReceiptPath(saleId, downloadToken);
  if (typeof window === 'undefined' || !window.location?.origin) return path;
  return `${window.location.origin}${path}`;
}

export function getLocalReceiptBookmarks(): BuyerReceipt[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_RECEIPTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalReceiptBookmark(receipt: BuyerReceipt): BuyerReceipt[] {
  if (typeof window === 'undefined' || !receipt?.saleId) return [];
  try {
    const existing = getLocalReceiptBookmarks().filter((r) => r.saleId !== receipt.saleId);
    const updated = [receipt, ...existing].slice(0, 30);
    window.localStorage.setItem(LOCAL_RECEIPTS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Resolve a StoreApp from a deep-link identifier (supports ID, `--<id>` suffix, exact slug, or normalized slug).
 */
export function findAppByRouteIdentifier(
  identifier: string,
  allApps: StoreApp[],
  editionHint?: 'phone' | 'tv'
): StoreApp | null {
  if (!identifier || !Array.isArray(allApps) || allApps.length === 0) return null;
  const raw = identifier.trim();
  const lower = raw.toLowerCase();

  // 1. Disambiguated `--<app.id>` suffix or direct ID match
  const doubleDashIdx = raw.lastIndexOf('--');
  if (doubleDashIdx !== -1) {
    const idCandidate = raw.slice(doubleDashIdx + 2).trim();
    const bySuffixId = allApps.find((a) => a.id === idCandidate);
    if (bySuffixId) return bySuffixId;
  }

  const byExactId = allApps.find((a) => a.id === raw || a.id.toLowerCase() === lower);
  if (byExactId) return byExactId;

  // 2. Exact slug matches (preferring requested edition if multiple exist)
  const exactSlugMatches = allApps.filter(
    (a) => a.slug && a.slug.trim().toLowerCase() === lower
  );
  if (exactSlugMatches.length === 1) return exactSlugMatches[0];
  if (exactSlugMatches.length > 1) {
    if (editionHint === 'tv') {
      return exactSlugMatches.find((a) => isTvApp(a) || Boolean(getTvRelease(a))) || exactSlugMatches[0];
    }
    return exactSlugMatches.find((a) => Boolean(getPhoneRelease(a))) || exactSlugMatches[0];
  }

  // 3. Normalized URL slug match
  const normalizedTarget = toUrlSlug(raw);
  if (normalizedTarget) {
    const slugMatches = allApps.filter((a) => getBaseAppSlug(a) === normalizedTarget);
    if (slugMatches.length === 1) return slugMatches[0];
    if (slugMatches.length > 1) {
      if (editionHint === 'tv') {
        return slugMatches.find((a) => isTvApp(a) || Boolean(getTvRelease(a))) || slugMatches[0];
      }
      return slugMatches.find((a) => Boolean(getPhoneRelease(a))) || slugMatches[0];
    }
  }

  return null;
}

/**
 * Reliable clipboard copy with legacy textarea fallback for embedded iframes or HTTP contexts.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // Fallback below
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch (_) {
      return false;
    }
  }

  return false;
}

export interface ShareAppResult {
  url: string;
  copied: boolean;
  sharedNatively: boolean;
}

/**
 * One-click copy canonical `/app/<slug>` URL to clipboard AND trigger native share sheet when supported.
 * Clipboard copy runs first and never fails if `navigator.share` is unavailable, blocked in an iframe, or cancelled.
 */
export async function shareOrCopyAppLink(
  app: StoreApp,
  allApps: StoreApp[] = [],
  edition?: 'phone' | 'tv'
): Promise<ShareAppResult> {
  const url = getAppShareUrl(app, allApps, edition);
  const copied = await copyTextToClipboard(url);

  let sharedNatively = false;
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const priceNote =
      app.pricing && app.pricing.type === 'paid' && (app.pricing.price || 0) > 0
        ? ` (${app.pricing.price.toLocaleString()} ${app.pricing.currency || 'UGX'})`
        : ' (Free APK)';
    try {
      await navigator.share({
        title: `${app.name}${priceNote} — ZuzuStore`,
        text: app.tagline || `Get ${app.name} directly on ZuzuStore`,
        url
      });
      sharedNatively = true;
    } catch (_) {
      // User dismissed share sheet or running in restricted iframe; clipboard copy already succeeded.
    }
  }

  return { url, copied, sharedNatively };
}

const DEFAULT_TITLE = 'ZuzuStore - Official App & APK Hub';
const DEFAULT_DESC =
  'ZuzuStore by Protector Technologies - Official Android App and Smart TV APK distribution portal with direct in-browser downloads, Leanback TV sideloading, and publisher management.';

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Synchronize document title and OpenGraph/Twitter tags for the active app or storefront view.
 */
export function updateDocumentAppMeta(app: StoreApp | null, allApps: StoreApp[] = [], edition?: 'phone' | 'tv'): void {
  if (typeof document === 'undefined') return;

  if (!app) {
    document.title = DEFAULT_TITLE;
    upsertMetaTag('name', 'description', DEFAULT_DESC);
    upsertMetaTag('property', 'og:title', DEFAULT_TITLE);
    upsertMetaTag('property', 'og:description', DEFAULT_DESC);
    upsertMetaTag('property', 'og:image', '/zuzustore-logo.png');
    if (typeof window !== 'undefined') {
      upsertMetaTag('property', 'og:url', window.location.origin);
    }
    return;
  }

  const priceSuffix =
    app.pricing && app.pricing.type === 'paid' && (app.pricing.price || 0) > 0
      ? ` • ${app.pricing.price.toLocaleString()} ${app.pricing.currency || 'UGX'}`
      : ' • Free APK';
  const title = `${app.name} (v${app.currentVersion})${priceSuffix} — ZuzuStore`;
  const description =
    app.tagline ||
    app.description?.slice(0, 160) ||
    `Download ${app.name} APK directly on ZuzuStore by Protector Technologies.`;
  const image = app.iconUrl || app.heroImageUrl || '/zuzustore-logo.png';
  const shareUrl = getAppShareUrl(app, allApps, edition);

  document.title = title;
  upsertMetaTag('name', 'description', description);
  upsertMetaTag('property', 'og:title', title);
  upsertMetaTag('property', 'og:description', description);
  upsertMetaTag('property', 'og:image', image);
  upsertMetaTag('property', 'og:url', shareUrl);
}
