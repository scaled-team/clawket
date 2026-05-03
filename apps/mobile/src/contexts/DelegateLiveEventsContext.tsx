/**
 * DelegateLiveEventsContext — Phase 4 real implementation.
 *
 * Subscribes to Supabase Realtime broadcasts on the per-user channel
 * `user:{userId}` and dispatches typed `delegation.*` / `agent.*` events to
 * handlers registered via `subscribe(eventType, handler)`.
 *
 * Flow:
 *   1. On mount (when `enabled` is true and a Delegate connection is
 *      available), POST `${apiUrl}/api/auth/realtime-token` with the user's
 *      Bearer token. Server returns `{ token, userId, channel }`.
 *   2. Lazy-import `@supabase/supabase-js` and create a singleton Realtime
 *      client + a single broadcast channel for `user:{userId}`.
 *   3. Listen for the wildcard `*` broadcast event and dispatch the
 *      `payload.type` to all registered handlers for that type.
 *   4. On 401 from the token endpoint, re-fetch up to 3× with backoff.
 *      Auto-refresh the JWT shortly before expiry (90% of TTL).
 *   5. On AppState `background`, unsubscribe + tear down the channel; on
 *      return to `active`, re-subscribe.
 *   6. Honor the 3-conn-per-user cap: this provider mounts ONCE at root and
 *      maintains exactly one client + one channel.
 *
 * Listener-error budget: every handler runs in a try/catch. If one handler
 * throws ≥ 3× within 60s, we drop it and log a warning.
 *
 * Required env: `EXPO_PUBLIC_SUPABASE_URL` (set in `.env.example`,
 * surfaced via `src/config/public.ts`).
 *
 * Required dep: `@supabase/supabase-js` — must be added with
 * `npm install --workspace apps/mobile @supabase/supabase-js` before this
 * context can attach. The module is dynamic-imported so a missing install
 * does NOT break app boot — `subscribe()` simply collects handlers and
 * dispatches nothing until the SDK is present.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  fetchRealtimeToken,
  pickEventName,
  ListenerErrorBudget,
} from './delegate-live-events-internal';

export type DelegateLiveEventType =
  | 'agent.message.new'
  | 'agent.message.streaming'
  | 'agent.approval.requested'
  | 'agent.created'
  | 'agent.updated'
  | 'delegation.started'
  | 'delegation.completed'
  | 'delegation.failed'
  | 'delegation.cancelled'
  | 'agent.poll.refresh';

export type DelegateLiveEventHandler = (payload: Record<string, unknown>) => void;

export type DelegateLiveEventsContextValue = {
  /** Subscribe to a live event type. Returns an unsubscribe function. */
  subscribe(eventType: DelegateLiveEventType, handler: DelegateLiveEventHandler): () => void;
};

export type DelegateLiveEventsConnection = {
  apiUrl: string;
  apiToken: string;
};

export type GetConnection = () => DelegateLiveEventsConnection | null;

type Props = {
  children: React.ReactNode;
  /** Returns the active Delegate apiUrl + apiToken, or null if not configured. */
  getConnection?: GetConnection;
  /** Supabase project URL. Falls back to `EXPO_PUBLIC_SUPABASE_URL`. */
  supabaseUrl?: string;
  /** When false the provider stays inert (collects handlers, never connects). */
  enabled?: boolean;
};

type RealtimeChannelInstance = {
  on(eventName: string, filter: { event: string }, cb: (msg: unknown) => void): unknown;
  subscribe(cb?: (status: string) => void): unknown;
  unsubscribe(): unknown;
};

type RealtimeClientHandle = {
  channel(name: string, opts?: unknown): RealtimeChannelInstance;
  removeChannel(channel: unknown): unknown;
  realtime?: { setAuth(token: string): unknown };
  setAuth?: (token: string) => unknown;
};

const DelegateLiveEventsContext = createContext<DelegateLiveEventsContextValue | null>(null);

const TOKEN_REFRESH_FRACTION = 0.9; // refresh at 90% of TTL
const LISTENER_ERROR_WINDOW_MS = 60_000;
const LISTENER_ERROR_THRESHOLD = 3;

async function loadSupabaseClient(): Promise<((url: string, key: string, opts?: unknown) => RealtimeClientHandle) | null> {
  try {
    // Lazy-import so missing package does NOT break app boot. Once the SDK is
    // installed (`@supabase/supabase-js`), this import resolves and the
    // provider attaches transparently.
    const mod = await import('@supabase/supabase-js');
    return (url: string, key: string, opts?: unknown) =>
      mod.createClient(url, key, opts as Record<string, unknown> | undefined) as unknown as RealtimeClientHandle;
  } catch {
    return null;
  }
}

export function DelegateLiveEventsProvider({
  children,
  getConnection,
  supabaseUrl,
  enabled = true,
}: Props): React.JSX.Element {
  // Map of event type → handler set. Handlers can be registered before the
  // Realtime client attaches; once it does, they start receiving events.
  const handlersRef = useRef<Map<DelegateLiveEventType, Set<DelegateLiveEventHandler>>>(
    new Map(),
  );

  // Listener-error budget — track per-handler-instance throw timestamps.
  const errorBudgetRef = useRef(new ListenerErrorBudget<DelegateLiveEventHandler>(
    LISTENER_ERROR_WINDOW_MS,
    LISTENER_ERROR_THRESHOLD,
  ));

  const dispatchEvent = useCallback((eventType: string, payload: Record<string, unknown>) => {
    const set = handlersRef.current.get(eventType as DelegateLiveEventType);
    if (!set || set.size === 0) return;
    const snapshot = Array.from(set);
    snapshot.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        const exhausted = errorBudgetRef.current.record(handler);
        if (exhausted) {
          // Drop the offending handler so it stops poisoning the dispatch loop.
          set.delete(handler);
          errorBudgetRef.current.forget(handler);
          // eslint-disable-next-line no-console
          console.error(
            `[DelegateLiveEvents] handler for "${eventType}" exceeded error budget — unsubscribed`,
            err,
          );
        } else {
          // eslint-disable-next-line no-console
          console.warn(`[DelegateLiveEvents] handler for "${eventType}" threw`, err);
        }
      }
    });
  }, []);

  const subscribe = useCallback(
    (eventType: DelegateLiveEventType, handler: DelegateLiveEventHandler): (() => void) => {
      const map = handlersRef.current;
      let set = map.get(eventType);
      if (!set) {
        set = new Set();
        map.set(eventType, set);
      }
      set.add(handler);
      return () => {
        const current = handlersRef.current.get(eventType);
        if (current) {
          current.delete(handler);
          if (current.size === 0) {
            handlersRef.current.delete(eventType);
          }
        }
        errorBudgetRef.current.forget(handler);
      };
    },
    [],
  );

  // ─── Realtime lifecycle ────────────────────────────────────────────────

  const clientRef = useRef<RealtimeClientHandle | null>(null);
  const channelRef = useRef<{ channel: RealtimeChannelInstance; channelName: string } | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastConnRef = useRef<DelegateLiveEventsConnection | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  // Latest connect implementation (for AppState handler reuse without re-binding).
  const connectFnRef = useRef<() => Promise<void>>(async () => {});
  const teardownFnRef = useRef<() => void>(() => {});

  const teardown = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    const ch = channelRef.current;
    if (ch) {
      try { ch.channel.unsubscribe(); } catch { /* ignore */ }
      try { clientRef.current?.removeChannel(ch.channel); } catch { /* ignore */ }
      channelRef.current = null;
    }
    // Keep clientRef around — `setAuth` is cheaper than recreating the client.
  }, []);

  const connect = useCallback(async (): Promise<void> => {
    if (!enabled) return;
    if (appStateRef.current !== 'active') return;
    const conn = getConnection?.() ?? null;
    if (!conn) return;
    const supabaseProjectUrl =
      supabaseUrl
      ?? (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_SUPABASE_URL : '')
      ?? '';
    if (!supabaseProjectUrl) {
      // Provider is structurally correct but cannot attach without
      // EXPO_PUBLIC_SUPABASE_URL. Handlers continue to register successfully.
      return;
    }

    let tokenResp: Awaited<ReturnType<typeof fetchRealtimeToken>>;
    try {
      tokenResp = await fetchRealtimeToken(conn.apiUrl, conn.apiToken);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[DelegateLiveEvents] failed to fetch realtime token', err);
      return;
    }

    const factory = await loadSupabaseClient();
    if (!factory) {
      // eslint-disable-next-line no-console
      console.warn(
        '[DelegateLiveEvents] @supabase/supabase-js not installed — live events inert. Install with: npm install --workspace apps/mobile @supabase/supabase-js',
      );
      return;
    }

    let client = clientRef.current;
    const lastConn = lastConnRef.current;
    if (!client || !lastConn || lastConn.apiUrl !== conn.apiUrl) {
      client = factory(supabaseProjectUrl, tokenResp.token, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        realtime: { params: { apikey: tokenResp.token } },
      });
      clientRef.current = client;
    } else {
      try { client.setAuth?.(tokenResp.token); } catch { /* ignore */ }
      try { client.realtime?.setAuth(tokenResp.token); } catch { /* ignore */ }
    }
    lastConnRef.current = conn;

    const channelName = tokenResp.channel; // e.g. "user:abc123"
    if (channelRef.current && channelRef.current.channelName === channelName) {
      // Already subscribed — keep the channel.
    } else {
      if (channelRef.current) {
        try { channelRef.current.channel.unsubscribe(); } catch { /* ignore */ }
        try { client.removeChannel(channelRef.current.channel); } catch { /* ignore */ }
        channelRef.current = null;
      }
      const channel = client.channel(channelName, { config: { broadcast: { self: false } } });
      channel.on('broadcast', { event: '*' }, (msg: unknown) => {
        // Supabase broadcast payload shape: { type: 'broadcast', event, payload }
        const message = msg as { event?: string; payload?: Record<string, unknown> } | null;
        if (!message) return;
        const eventName = pickEventName(message);
        if (!eventName) return;
        dispatchEvent(eventName, message.payload ?? {});
      });
      channel.subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // eslint-disable-next-line no-console
          console.warn(`[DelegateLiveEvents] channel ${channelName} status: ${status}`);
        }
      });
      channelRef.current = { channel, channelName };
    }

    // Schedule a refresh well before the JWT expires.
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    const refreshMs = Math.max(30_000, Math.floor(tokenResp.ttlSeconds * 1000 * TOKEN_REFRESH_FRACTION));
    refreshTimerRef.current = setTimeout(() => { void connect(); }, refreshMs);
  }, [dispatchEvent, enabled, getConnection, supabaseUrl]);

  // Keep refs in sync so AppState handler can call them without re-binding.
  useEffect(() => { connectFnRef.current = connect; }, [connect]);
  useEffect(() => { teardownFnRef.current = teardown; }, [teardown]);

  // Initial connect.
  useEffect(() => {
    void connect();
    return () => { teardown(); };
  }, [connect, teardown]);

  // AppState gating — pause on background, resume on active.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev === next) return;
      if (next === 'background' || next === 'inactive') {
        teardownFnRef.current();
      } else if (next === 'active') {
        void connectFnRef.current();
      }
    });
    return () => { sub.remove(); };
  }, []);

  const value = useMemo<DelegateLiveEventsContextValue>(() => ({ subscribe }), [subscribe]);

  return (
    <DelegateLiveEventsContext.Provider value={value}>
      {children}
    </DelegateLiveEventsContext.Provider>
  );
}

/** Hook to consume live events. Safe to call without a provider — returns no-op. */
export function useDelegateLiveEvents(): DelegateLiveEventsContextValue {
  const ctx = useContext(DelegateLiveEventsContext);
  if (!ctx) {
    return { subscribe: () => () => {} };
  }
  return ctx;
}

// Exported for tests.
export const __testing = {
  loadSupabaseClient,
};
