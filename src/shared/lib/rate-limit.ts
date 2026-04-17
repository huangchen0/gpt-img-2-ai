import { md5 } from '@/shared/lib/hash';

type MinIntervalOptions = {
  /**
   * Minimum interval between requests for the same key.
   */
  intervalMs: number;
  /**
   * Optional namespace to avoid key collisions across endpoints.
   */
  keyPrefix?: string;
  /**
   * Extra key material if you want to scope more granularly.
   */
  extraKey?: string;
};

type StoreEntry = {
  lastSeenAt: number;
  intervalMs: number;
};

type Store = Map<string, StoreEntry>;

const MAX_STORE_ENTRIES = 5000;
const CLEANUP_INTERVAL_MS = 30 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var __minIntervalRateLimitStore: Store | undefined;
  // eslint-disable-next-line no-var
  var __minIntervalRateLimitLastCleanupAt: number | undefined;
}

function getClientIpFromRequest(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    // x-forwarded-for can be "client, proxy1, proxy2"
    return xff.split(',')[0]?.trim() || '';
  }

  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    ''
  );
}

function getStore(): Store {
  if (!globalThis.__minIntervalRateLimitStore) {
    globalThis.__minIntervalRateLimitStore = new Map();
  }
  return globalThis.__minIntervalRateLimitStore;
}

function pruneExpiredEntries(store: Store, now: number) {
  for (const [key, entry] of store) {
    if (now - entry.lastSeenAt >= entry.intervalMs) {
      store.delete(key);
    }
  }
}

function enforceStoreLimit(store: Store) {
  while (store.size > MAX_STORE_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (!oldestKey) {
      break;
    }
    store.delete(oldestKey);
  }
}

function cleanupStore(store: Store, now: number) {
  const lastCleanupAt = globalThis.__minIntervalRateLimitLastCleanupAt || 0;
  if (
    now - lastCleanupAt < CLEANUP_INTERVAL_MS &&
    store.size <= MAX_STORE_ENTRIES
  ) {
    return;
  }

  pruneExpiredEntries(store, now);
  enforceStoreLimit(store);
  globalThis.__minIntervalRateLimitLastCleanupAt = now;
}

function buildKey(request: Request, opts: MinIntervalOptions): string {
  const url = new URL(request.url);
  const ip = getClientIpFromRequest(request);
  const cookie = request.headers.get('cookie') || '';
  const cookieHash = cookie ? md5(cookie) : 'no-cookie';
  const prefix = opts.keyPrefix || 'min-interval';
  const extra = opts.extraKey ? `|${opts.extraKey}` : '';
  return `${prefix}|${request.method}|${url.pathname}|${ip}|${cookieHash}${extra}`;
}

/**
 * Enforce a minimum interval for the same endpoint + identity.
 *
 * Returns a 429 Response when the request is too frequent, otherwise null.
 */
export function enforceMinIntervalRateLimit(
  request: Request,
  opts: MinIntervalOptions
): Response | null {
  const intervalMs = Math.max(0, Number(opts.intervalMs) || 0);
  if (!intervalMs) return null;

  const now = Date.now();
  const store = getStore();
  cleanupStore(store, now);
  const key = buildKey(request, opts);
  const entry = store.get(key);

  if (entry) {
    const delta = now - entry.lastSeenAt;
    if (delta >= 0 && delta < intervalMs) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((intervalMs - delta) / 1000)
      );
      return Response.json(
        {
          error: 'too_many_requests',
          message: `Please retry after ${retryAfterSeconds}s.`,
        },
        {
          status: 429,
          headers: {
            'cache-control': 'no-store',
            'retry-after': String(retryAfterSeconds),
          },
        }
      );
    }
  }

  if (entry) {
    store.delete(key);
  }
  store.set(key, {
    lastSeenAt: now,
    intervalMs,
  });
  enforceStoreLimit(store);
  return null;
}
