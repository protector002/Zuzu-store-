import type express from 'express';

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  message?: string;
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

function extractClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0]).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Lightweight per-IP sliding/window rate limiter for auth, checkout, lookup, and reviews.
 * Pure JS (zero external dependencies) for instant cold starts on Vercel/Node 22.
 */
export function createRateLimiter(options: RateLimiterOptions): express.RequestHandler {
  const buckets = new Map<string, BucketEntry>();
  const { windowMs, maxRequests, keyPrefix, message } = options;

  // Periodic cleanup to keep memory bounded even under heavy load
  let lastPruneAt = Date.now();

  return (req, res, next) => {
    const now = Date.now();
    if (now - lastPruneAt > Math.max(windowMs, 60_000) || buckets.size > 5000) {
      lastPruneAt = now;
      for (const [k, entry] of buckets.entries()) {
        if (entry.resetAt <= now) {
          buckets.delete(k);
        }
      }
    }

    const ip = extractClientIp(req);
    const key = `${keyPrefix}:${ip}`;
    let entry = buckets.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 1, resetAt: now + windowMs };
      buckets.set(key, entry);
    } else {
      entry.count += 1;
    }

    const remaining = Math.max(0, maxRequests - entry.count);
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        error: message || `Too many requests. Please wait ${retryAfterSec} seconds and try again.`
      });
    }

    return next();
  };
}

interface CacheItem<T> {
  value: T;
  expiresAt: number;
}

/**
 * In-memory TTL cache for hot read-heavy public store routes (/api/apps, /api/stats, /api/broadcast, etc.)
 */
export class TtlCache<T> {
  private store = new Map<string, CacheItem<T>>();
  private defaultTtlMs: number;

  constructor(defaultTtlMs = 15_000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs;
    if (this.store.size > 300) {
      const now = Date.now();
      for (const [k, v] of this.store.entries()) {
        if (now > v.expiresAt) this.store.delete(k);
      }
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttl });
  }

  clear(): void {
    this.store.clear();
  }
}

export const publicAppsCache = new TtlCache<any>(15_000);
export const publicStatsCache = new TtlCache<any>(15_000);

export function invalidatePublicStoreCache(): void {
  publicAppsCache.clear();
  publicStatsCache.clear();
}

// ==========================================
// Checkout & Webhook Idempotency Protection
// ==========================================
interface CheckoutPendingGuard {
  saleId: string;
  createdAt: number;
}

const recentCheckoutGuard = new Map<string, CheckoutPendingGuard>();
const activeWebhookSaleLocks = new Set<string>();

export function buildCheckoutKey(appId: string, email?: string, phone?: string): string {
  const normApp = String(appId || '').trim().toLowerCase();
  const normEmail = String(email || '').trim().toLowerCase();
  const normPhone = String(phone || '').replace(/\D+/g, '').slice(-9);
  return `${normApp}|${normEmail}|${normPhone}`;
}

export function getRecentPendingCheckoutSaleId(key: string, windowMs = 15_000): string | null {
  const entry = recentCheckoutGuard.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > windowMs) {
    recentCheckoutGuard.delete(key);
    return null;
  }
  return entry.saleId;
}

export function rememberPendingCheckoutSaleId(key: string, saleId: string): void {
  if (recentCheckoutGuard.size > 1000) {
    const cutoff = Date.now() - 30_000;
    for (const [k, v] of recentCheckoutGuard.entries()) {
      if (v.createdAt < cutoff) recentCheckoutGuard.delete(k);
    }
  }
  recentCheckoutGuard.set(key, { saleId, createdAt: Date.now() });
}

export function acquireWebhookSaleLock(saleId: string): boolean {
  if (!saleId || activeWebhookSaleLocks.has(saleId)) return false;
  activeWebhookSaleLocks.add(saleId);
  return true;
}

export function releaseWebhookSaleLock(saleId: string): void {
  if (saleId) activeWebhookSaleLocks.delete(saleId);
}
