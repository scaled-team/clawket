/**
 * WorkspaceContext — DelegateMobile workspace selection.
 *
 * Mounts inside `DelegateLiveEventsProvider` so it can subscribe to
 * `delegation.* / agent.created / agent.updated` and refresh the workspace
 * list opportunistically (no polling — see `db_connection_management.md`).
 *
 * Inert when no Delegate connection is available, so OpenClaw + Hermes flows
 * are untouched. Capability-flag gating happens at the consumer level via
 * `selectByBackend(...)` — this provider itself is safe to mount globally.
 *
 * Persists `activeWorkspaceId` to `AsyncStorage` under
 * `delegate:active-workspace`.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  listDelegateWorkspaces,
  type DelegateWorkspaceSummary,
} from '../services/delegate-workspaces';
import { useDelegateLiveEvents } from './DelegateLiveEventsContext';
import { pickActiveWorkspaceId, resolveActiveWorkspace } from './workspace-context-internal';

const STORAGE_KEY = 'delegate:active-workspace';
const REFRESH_DEBOUNCE_MS = 500;

export type WorkspaceContextValue = {
  workspaces: DelegateWorkspaceSummary[];
  activeWorkspace: DelegateWorkspaceSummary | null;
  loading: boolean;
  error: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  refresh: () => Promise<void>;
};

export type WorkspaceConnection = {
  apiUrl: string;
  apiToken: string;
};

type GetConnection = () => WorkspaceConnection | null;

type Props = {
  children: React.ReactNode;
  /**
   * Returns the active Delegate connection — when this returns `null` the
   * provider stays inert (an empty list, no-op refresh).
   */
  getConnection?: GetConnection;
  /** When false the provider stays inert (capability-flag gate). */
  enabled?: boolean;
  /** Optional override for the AsyncStorage backing — used in tests. */
  storage?: Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;
};

const Context = createContext<WorkspaceContextValue | null>(null);

const NOOP_VALUE: WorkspaceContextValue = {
  workspaces: [],
  activeWorkspace: null,
  loading: false,
  error: null,
  setActiveWorkspaceId: () => {},
  refresh: async () => {},
};

export function WorkspaceProvider({
  children,
  getConnection,
  enabled = true,
  storage = AsyncStorage,
}: Props): React.JSX.Element {
  const [workspaces, setWorkspaces] = useState<DelegateWorkspaceSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const liveEvents = useDelegateLiveEvents();
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHydratedRef = useRef(false);

  const isActive = enabled && !!getConnection;

  const resolveConnection = useCallback((): WorkspaceConnection | null => {
    if (!isActive || !getConnection) return null;
    return getConnection();
  }, [isActive, getConnection]);

  const fetchWorkspaces = useCallback(async () => {
    const connection = resolveConnection();
    if (!connection) {
      setWorkspaces([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await listDelegateWorkspaces(connection);
      setWorkspaces(list);
      // Auto-select first owner-workspace if no current selection lands in
      // the list (covers first launch + workspaces removed remotely).
      setActiveId((prev) => pickActiveWorkspaceId(prev, list));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, [resolveConnection]);

  // On first mount: hydrate persisted active id, then fetch once.
  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    void (async () => {
      try {
        const stored = await storage.getItem(STORAGE_KEY);
        if (!cancelled && stored) setActiveId(stored);
      } catch {
        // Ignore storage read errors — we still fetch the list.
      } finally {
        hasHydratedRef.current = true;
        if (!cancelled) await fetchWorkspaces();
      }
    })();
    return () => {
      cancelled = true;
    };
    // We intentionally only run on `isActive` flip + initial mount; the
    // explicit `refresh()` and LiveEvents path covers all subsequent reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Persist active id whenever it changes (and after hydration so we don't
  // overwrite the stored value with `null` before reading it).
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    void (async () => {
      try {
        if (activeId) {
          await storage.setItem(STORAGE_KEY, activeId);
        } else {
          await storage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Storage errors are non-fatal.
      }
    })();
  }, [activeId, storage]);

  // Subscribe to LiveEvents that may invalidate the workspace list.
  useEffect(() => {
    if (!isActive) return undefined;
    const debouncedRefresh = () => {
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
      refreshDebounceRef.current = setTimeout(() => {
        void fetchWorkspaces();
      }, REFRESH_DEBOUNCE_MS);
    };
    const offs = [
      liveEvents.subscribe('delegation.started', debouncedRefresh),
      liveEvents.subscribe('delegation.completed', debouncedRefresh),
      liveEvents.subscribe('delegation.failed', debouncedRefresh),
      liveEvents.subscribe('agent.created', debouncedRefresh),
      liveEvents.subscribe('agent.updated', debouncedRefresh),
    ];
    return () => {
      offs.forEach((off) => off());
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
        refreshDebounceRef.current = null;
      }
    };
  }, [isActive, liveEvents, fetchWorkspaces]);

  const setActiveWorkspaceId = useCallback((id: string | null) => {
    setActiveId(id);
  }, []);

  const activeWorkspace = useMemo(
    () => resolveActiveWorkspace(activeId, workspaces),
    [activeId, workspaces],
  );

  const value = useMemo<WorkspaceContextValue>(() => ({
    workspaces,
    activeWorkspace,
    loading,
    error,
    setActiveWorkspaceId,
    refresh: fetchWorkspaces,
  }), [workspaces, activeWorkspace, loading, error, setActiveWorkspaceId, fetchWorkspaces]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/**
 * Hook to consume workspace context. Safe to call without a provider —
 * returns an inert no-op value so OpenClaw/Hermes screens that import
 * this hook do not crash.
 */
export function useDelegateWorkspace(): WorkspaceContextValue {
  const ctx = useContext(Context);
  return ctx ?? NOOP_VALUE;
}
