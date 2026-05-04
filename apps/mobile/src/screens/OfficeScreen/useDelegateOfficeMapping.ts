/**
 * useDelegateOfficeMapping — Phase 4.5
 *
 * Resolves Delegate workspace concepts to office-game character slots.
 * Used by OfficeTab to drive SESSION_UPDATE + boss presence when
 * `officeGameDelegate === true`.
 *
 * Character mapping (MVP):
 *   boss       ← signed-in workspace user (always present while session active)
 *   assistant  ← workspace's first AgentProfile (sorted createdAt asc)
 *   subagent   ← AgentProfile of the assigneeAgentId for the most recently
 *                updated running TaskDelegation (if any)
 *   cron       ← reserved / static for MVP
 *   channel1–4 ← cross-backend messaging slots; not Delegate-specific
 *
 * Invalidated by LiveEvents via the Phase 4 stub context.
 * When Phase 4 lands the stub subscribe() will fire real events.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { useDelegateLiveEvents } from '../../contexts/DelegateLiveEventsContext';
import { useDelegateWorkspace } from '../../contexts/WorkspaceContext';
import { listDelegateAgents } from '../../services/delegate-agents';
import { listActiveDelegations } from '../../services/gateway-backend-operations';
import type { AgentProfileRow } from '../../services/delegate-agents';

export interface DelegateOfficeMapping {
  boss: { userId: string; present: boolean } | null;
  assistant: { agentId: string; agentName: string } | null;
  subagent: { agentId: string; agentName: string; delegationId: string } | null;
  cron: null;
  characterToAgentId: Record<
    'boss' | 'assistant' | 'subagent' | 'cron' | 'channel1' | 'channel2' | 'channel3' | 'channel4',
    string | null
  >;
}

const EMPTY_MAPPING: DelegateOfficeMapping = {
  boss: null,
  assistant: null,
  subagent: null,
  cron: null,
  characterToAgentId: {
    boss: null,
    assistant: null,
    subagent: null,
    cron: null,
    channel1: null,
    channel2: null,
    channel3: null,
    channel4: null,
  },
};

function buildMapping(
  userId: string | null,
  agents: AgentProfileRow[],
  runningDelegations: Array<{ id: string; assigneeAgentId?: string | null; updatedAt?: string | null }>,
): DelegateOfficeMapping {
  // boss
  const boss = userId
    ? { userId, present: true }
    : null;

  // assistant — first agent sorted by createdAt asc.
  // AgentProfileRow doesn't expose createdAt; use list order (API returns asc).
  const assistantAgent = agents.length > 0 ? agents[0] : null;
  const assistant = assistantAgent
    ? { agentId: assistantAgent.id, agentName: assistantAgent.name }
    : null;

  // subagent — running delegation; if multiple, pick most recently updated.
  let subagent: DelegateOfficeMapping['subagent'] = null;
  if (runningDelegations.length > 0) {
    const sorted = [...runningDelegations].sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });
    const topDelegation = sorted[0];
    const assigneeId = topDelegation.assigneeAgentId ?? null;
    if (assigneeId) {
      const agentRow = agents.find((a) => a.id === assigneeId);
      subagent = {
        agentId: assigneeId,
        agentName: agentRow?.name ?? assigneeId,
        delegationId: topDelegation.id,
      };
    }
  }

  const characterToAgentId: DelegateOfficeMapping['characterToAgentId'] = {
    boss: boss?.userId ?? null,
    assistant: assistant?.agentId ?? null,
    subagent: subagent?.agentId ?? null,
    cron: null,
    channel1: null,
    channel2: null,
    channel3: null,
    channel4: null,
  };

  return { boss, assistant, subagent, cron: null, characterToAgentId };
}

export function useDelegateOfficeMapping(): DelegateOfficeMapping {
  const { gateway } = useAppContext();
  const { subscribe } = useDelegateLiveEvents();
  const { activeWorkspace } = useDelegateWorkspace();
  const [mapping, setMapping] = useState<DelegateOfficeMapping>(EMPTY_MAPPING);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    const dc = gateway.getDelegateConfig?.();
    // Extract userId from session — gateway may expose getSessionUserId or similar.
    // Fall back to null; boss presence requires a real userId.
    const userId: string | null = (gateway as any).getUserId?.() ?? null;

    if (!dc) {
      if (mountedRef.current) setMapping(EMPTY_MAPPING);
      return;
    }

    try {
      const [agentsResult, delegations] = await Promise.all([
        listDelegateAgents(
          dc,
          activeWorkspace?.id ? { workspaceId: activeWorkspace.id } : undefined,
        ),
        listActiveDelegations(dc),
      ]);
      if (!mountedRef.current) return;
      const next = buildMapping(userId, agentsResult.agents, delegations);
      setMapping(next);
    } catch {
      // Best-effort; degrade to empty mapping.
      if (mountedRef.current) setMapping(EMPTY_MAPPING);
    }
  }, [gateway, activeWorkspace?.id]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  // Invalidate on relevant LiveEvents (Phase 4 stub returns no-op unsubscribes)
  useEffect(() => {
    const handlers: Array<() => void> = [
      subscribe('delegation.started', () => { void refresh(); }),
      subscribe('delegation.completed', () => { void refresh(); }),
      subscribe('delegation.failed', () => { void refresh(); }),
      subscribe('delegation.cancelled', () => { void refresh(); }),
      subscribe('agent.created', () => { void refresh(); }),
      subscribe('agent.updated', () => { void refresh(); }),
    ];
    return () => {
      for (const unsub of handlers) unsub();
    };
  }, [subscribe, refresh]);

  return mapping;
}
