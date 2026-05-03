/**
 * Internal helpers for DelegateLiveEventsContext, extracted into a `.ts`
 * (no JSX) module so they can be unit-tested directly. The `.tsx` provider
 * file consumes these helpers — keep its JSX-using surface thin.
 */

const TOKEN_FETCH_MAX_ATTEMPTS = 3;
const TOKEN_FETCH_BASE_DELAY_MS = 500;

export type RealtimeTokenResponse = {
  token: string;
  userId: string;
  channel: string;
  ttlSeconds: number;
  expiresAt: string;
};

export function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches a short-lived Supabase Realtime JWT from Delegate. Retries on 401
 * (token may have rotated) and 5xx with a small backoff. On 429 (caller hit
 * the 6/min server-side limiter) backs off significantly.
 */
export async function fetchRealtimeToken(
  apiUrl: string,
  apiToken: string,
  // For tests — inject a fake fetch.
  fetcher: typeof fetch = fetch,
): Promise<RealtimeTokenResponse> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < TOKEN_FETCH_MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetcher(`${trimTrailingSlash(apiUrl)}/api/auth/realtime-token`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.status === 401) {
        lastErr = new Error('realtime-token 401');
        await sleep(TOKEN_FETCH_BASE_DELAY_MS * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        lastErr = new Error(`realtime-token HTTP ${res.status}`);
        if (res.status === 429) {
          await sleep(10_000);
        } else {
          await sleep(TOKEN_FETCH_BASE_DELAY_MS * (attempt + 1));
        }
        continue;
      }
      const body = (await res.json()) as {
        success?: boolean;
        data?: RealtimeTokenResponse;
      };
      const data = body.data;
      if (!data?.token || !data?.userId || !data?.channel) {
        lastErr = new Error('realtime-token malformed response');
        await sleep(TOKEN_FETCH_BASE_DELAY_MS * (attempt + 1));
        continue;
      }
      return data;
    } catch (err) {
      lastErr = err;
      await sleep(TOKEN_FETCH_BASE_DELAY_MS * (attempt + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('realtime-token fetch failed');
}

/**
 * Selects the canonical event name from a Supabase broadcast message.
 * Delegate emits with `event` AND a `type` claim inside payload — prefer
 * `payload.type` since that's the canonical event-name from
 * `lib/supabase-realtime.ts` (e.g. "delegation.started").
 */
export function pickEventName(message: { event?: string; payload?: Record<string, unknown> } | null): string {
  if (!message) return '';
  const fromPayload = message.payload?.type;
  if (typeof fromPayload === 'string' && fromPayload) return fromPayload;
  return message.event ?? '';
}

/**
 * Listener-error budget: tracks per-handler-instance throw timestamps so a
 * single misbehaving handler can be quarantined after ≥ N throws in a window.
 */
export class ListenerErrorBudget<H> {
  private readonly windowMs: number;
  private readonly threshold: number;
  private readonly throwTimes = new Map<H, number[]>();

  constructor(windowMs: number, threshold: number) {
    this.windowMs = windowMs;
    this.threshold = threshold;
  }

  /** Returns true when the handler has exhausted its error budget. */
  record(handler: H): boolean {
    const now = Date.now();
    const times = (this.throwTimes.get(handler) ?? []).filter((t) => now - t < this.windowMs);
    times.push(now);
    this.throwTimes.set(handler, times);
    return times.length >= this.threshold;
  }

  forget(handler: H): void {
    this.throwTimes.delete(handler);
  }
}
