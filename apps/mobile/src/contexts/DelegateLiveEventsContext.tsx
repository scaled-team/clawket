/**
 * DelegateLiveEventsContext — Phase 4 stub.
 *
 * TODO(phase-4): Replace this stub with real Realtime/SSE wiring.
 * This context is consumed by `useDelegateOfficeMapping` (Phase 4.5) and other
 * Delegate-specific hooks that need to react to server-sent events.
 *
 * The stub returns no-op subscribe/unsubscribe so the office-game Delegate
 * integration (Phase 4.5) compiles and runs without crashing. Events will NOT
 * arrive until Phase 4 replaces this stub.
 *
 * Connection budget: the real implementation must stay within the 3-SSE-conn cap
 * (per Phase 4 design). The stub consumes 0 connections.
 */

import React, { createContext, useContext, useCallback } from 'react';

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

const DelegateLiveEventsContext = createContext<DelegateLiveEventsContextValue | null>(null);

/** No-op provider. Phase 4 will replace the implementation. */
export function DelegateLiveEventsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const subscribe = useCallback(
    (_eventType: DelegateLiveEventType, _handler: DelegateLiveEventHandler): (() => void) => {
      // TODO(phase-4): subscribe to real Realtime/SSE channel here
      return () => {};
    },
    [],
  );

  return (
    <DelegateLiveEventsContext.Provider value={{ subscribe }}>
      {children}
    </DelegateLiveEventsContext.Provider>
  );
}

/** Hook to consume live events. Safe to call even before Phase 4 lands — returns no-op. */
export function useDelegateLiveEvents(): DelegateLiveEventsContextValue {
  const ctx = useContext(DelegateLiveEventsContext);
  if (!ctx) {
    // Fallback no-op so callers outside the provider tree don't crash.
    return {
      subscribe: () => () => {},
    };
  }
  return ctx;
}
