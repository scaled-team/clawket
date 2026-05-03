/**
 * DelegateLiveEventsContext — unit tests
 *
 * Tests live against the pure helper module
 * `delegate-live-events-internal.ts` (no JSX, easy to transform under
 * ts-jest). The .tsx provider file composes these helpers — covering the
 * helpers covers the structural correctness of the provider's network +
 * dispatch + budget logic.
 *
 * Full integration test of the React provider is deferred to e2e (detox)
 * because expo's tsconfig (`module: "preserve"` + `jsx: "react-native"`)
 * does not round-trip cleanly through ts-jest in CommonJS mode.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  fetchRealtimeToken,
  pickEventName,
  ListenerErrorBudget,
  trimTrailingSlash,
} from './delegate-live-events-internal';

const TOKEN_RESPONSE = {
  success: true,
  data: {
    token: 'fake.jwt.token',
    userId: 'user_abc',
    channel: 'user:user_abc',
    ttlSeconds: 600,
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
  },
};

function makeFetcher(...statuses: Array<{ status: number; body?: unknown }>): jest.Mock {
  const mock = jest.fn();
  statuses.forEach((s) => {
    mock.mockImplementationOnce(async () => ({
      ok: s.status >= 200 && s.status < 300,
      status: s.status,
      json: async () => s.body ?? {},
    }) as unknown as Response);
  });
  return mock;
}

describe('trimTrailingSlash', () => {
  it('removes trailing slashes', () => {
    expect(trimTrailingSlash('https://x.y/')).toBe('https://x.y');
    expect(trimTrailingSlash('https://x.y///')).toBe('https://x.y');
    expect(trimTrailingSlash('https://x.y')).toBe('https://x.y');
  });
});

describe('pickEventName', () => {
  it('prefers payload.type over message.event', () => {
    expect(pickEventName({ event: 'broadcast', payload: { type: 'delegation.started' } })).toBe(
      'delegation.started',
    );
  });

  it('falls back to message.event when payload.type is missing', () => {
    expect(pickEventName({ event: 'agent.message.new', payload: {} })).toBe(
      'agent.message.new',
    );
  });

  it('returns empty string for null or empty', () => {
    expect(pickEventName(null)).toBe('');
    expect(pickEventName({})).toBe('');
  });
});

describe('fetchRealtimeToken', () => {
  it('parses success response into typed payload', async () => {
    const fetcher = makeFetcher({ status: 200, body: TOKEN_RESPONSE });
    const out = await fetchRealtimeToken('https://delegate.ws', 't', fetcher as unknown as typeof fetch);
    expect(out.token).toBe('fake.jwt.token');
    expect(out.channel).toBe('user:user_abc');
    expect(out.ttlSeconds).toBe(600);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      'https://delegate.ws/api/auth/realtime-token',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer t' }),
      }),
    );
  });

  it('retries on 401 then succeeds', async () => {
    const fetcher = makeFetcher(
      { status: 401 },
      { status: 200, body: TOKEN_RESPONSE },
    );
    const out = await fetchRealtimeToken('https://delegate.ws', 't', fetcher as unknown as typeof fetch);
    expect(out.userId).toBe('user_abc');
    expect(fetcher).toHaveBeenCalledTimes(2);
  }, 10_000);

  it('throws after 3 consecutive failures', async () => {
    const fetcher = makeFetcher(
      { status: 500 },
      { status: 500 },
      { status: 500 },
    );
    await expect(
      fetchRealtimeToken('https://delegate.ws', 't', fetcher as unknown as typeof fetch),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(3);
  }, 10_000);

  it('rejects when response body has no token', async () => {
    const fetcher = makeFetcher(
      { status: 200, body: { success: true, data: { userId: 'x', channel: 'user:x' } } },
      { status: 200, body: { success: true, data: { userId: 'x', channel: 'user:x' } } },
      { status: 200, body: { success: true, data: { userId: 'x', channel: 'user:x' } } },
    );
    await expect(
      fetchRealtimeToken('https://delegate.ws', 't', fetcher as unknown as typeof fetch),
    ).rejects.toThrow(/malformed/);
  }, 10_000);

  it('strips trailing slashes from apiUrl', async () => {
    const fetcher = makeFetcher({ status: 200, body: TOKEN_RESPONSE });
    await fetchRealtimeToken('https://delegate.ws/', 't', fetcher as unknown as typeof fetch);
    expect(fetcher).toHaveBeenCalledWith(
      'https://delegate.ws/api/auth/realtime-token',
      expect.any(Object),
    );
  });
});

describe('ListenerErrorBudget', () => {
  it('returns false until threshold is reached, then true', () => {
    const handler = () => {};
    const budget = new ListenerErrorBudget<() => void>(60_000, 3);
    expect(budget.record(handler)).toBe(false); // 1
    expect(budget.record(handler)).toBe(false); // 2
    expect(budget.record(handler)).toBe(true);  // 3 — exhausted
  });

  it('expires old throws outside the window', async () => {
    const handler = () => {};
    const budget = new ListenerErrorBudget<() => void>(50, 3);
    expect(budget.record(handler)).toBe(false);
    expect(budget.record(handler)).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    // Old throws have expired — counter resets.
    expect(budget.record(handler)).toBe(false);
    expect(budget.record(handler)).toBe(false);
  });

  it('forget() clears the handler entry', () => {
    const handler = () => {};
    const budget = new ListenerErrorBudget<() => void>(60_000, 3);
    budget.record(handler);
    budget.record(handler);
    budget.forget(handler);
    expect(budget.record(handler)).toBe(false); // counter reset
    expect(budget.record(handler)).toBe(false);
    expect(budget.record(handler)).toBe(true);  // 3 — exhausted again
  });

  it('tracks per-handler counters independently', () => {
    const a = () => {};
    const b = () => {};
    const budget = new ListenerErrorBudget<() => void>(60_000, 3);
    expect(budget.record(a)).toBe(false);
    expect(budget.record(a)).toBe(false);
    expect(budget.record(b)).toBe(false); // b's first throw
    expect(budget.record(a)).toBe(true);  // a hits threshold; b unaffected
    expect(budget.record(b)).toBe(false); // b still has budget
  });
});
