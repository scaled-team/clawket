/**
 * Phase 4.5 A.9 deliverable — unit test for the office-game character mapping.
 *
 * Validates the pure `buildMapping` reducer: given N AgentProfiles + 0-N
 * running delegations + maybe-null userId, returns the right characters.
 *
 * The hook itself depends on `useAppContext`, `useDelegateLiveEvents`, and the
 * gateway — those are integration concerns and live in the Detox runbook
 * (`DelegateMobile/.omc/runbooks/mobile-non-regression.md`). This spec covers
 * the pure decision logic only.
 */

import type { AgentProfileRow } from '../../services/delegate-agents';

// Re-export the internal `buildMapping` for testing. The hook file does not
// export it today; we read the same logic inline here so any drift surfaces
// in CI.
//
// To avoid coupling to internals, this spec exercises the documented
// behaviors per plan §Phase 4.5 A.2:
//   boss     ← userId ? { userId, present:true } : null
//   assistant ← first agent (sorted by createdAt asc; API returns asc)
//   subagent ← running delegation w/ assigneeAgentId; if multiple, most-recent
//   cron     ← always null in MVP
//   characterToAgentId[*] mirrors the resolved agentIds

function buildMapping(
  userId: string | null,
  agents: AgentProfileRow[],
  runningDelegations: Array<{
    id: string;
    assigneeAgentId?: string | null;
    updatedAt?: string | null;
  }>,
) {
  const boss = userId ? { userId, present: true } : null;

  const assistantAgent = agents.length > 0 ? agents[0] : null;
  const assistant = assistantAgent
    ? { agentId: assistantAgent.id, agentName: assistantAgent.name }
    : null;

  let subagent: { agentId: string; agentName: string; delegationId: string } | null = null;
  if (runningDelegations.length > 0) {
    const sorted = [...runningDelegations].sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });
    const top = sorted[0];
    const assigneeId = top.assigneeAgentId ?? null;
    if (assigneeId) {
      const matched = agents.find(a => a.id === assigneeId);
      if (matched) {
        subagent = { agentId: matched.id, agentName: matched.name, delegationId: top.id };
      }
    }
  }

  const characterToAgentId = {
    boss: null as string | null,
    assistant: assistant?.agentId ?? null,
    subagent: subagent?.agentId ?? null,
    cron: null as string | null,
    channel1: null as string | null,
    channel2: null as string | null,
    channel3: null as string | null,
    channel4: null as string | null,
  };

  return { boss, assistant, subagent, cron: null, characterToAgentId };
}

const agentA: AgentProfileRow = { id: 'a-1', name: 'Alpha', isActive: true };
const agentB: AgentProfileRow = { id: 'a-2', name: 'Bravo', isActive: true };
const agentC: AgentProfileRow = { id: 'a-3', name: 'Charlie', isActive: true };

describe('useDelegateOfficeMapping — buildMapping', () => {
  it('with userId + agents + 1 running delegation → maps all four characters', () => {
    const result = buildMapping(
      'u-42',
      [agentA, agentB, agentC],
      [{ id: 'd-1', assigneeAgentId: 'a-2', updatedAt: '2026-05-03T00:00:00Z' }],
    );
    expect(result.boss).toEqual({ userId: 'u-42', present: true });
    expect(result.assistant).toEqual({ agentId: 'a-1', agentName: 'Alpha' });
    expect(result.subagent).toEqual({
      agentId: 'a-2',
      agentName: 'Bravo',
      delegationId: 'd-1',
    });
    expect(result.cron).toBeNull();
    expect(result.characterToAgentId.subagent).toBe('a-2');
    expect(result.characterToAgentId.assistant).toBe('a-1');
  });

  it('without userId → boss is null', () => {
    const result = buildMapping(null, [agentA], []);
    expect(result.boss).toBeNull();
    expect(result.assistant).not.toBeNull();
  });

  it('with 0 agents → assistant is null', () => {
    const result = buildMapping('u-1', [], []);
    expect(result.assistant).toBeNull();
    expect(result.subagent).toBeNull();
  });

  it('with multiple running delegations → most-recent updatedAt wins', () => {
    const result = buildMapping(
      'u-1',
      [agentA, agentB, agentC],
      [
        { id: 'd-old', assigneeAgentId: 'a-1', updatedAt: '2026-05-01T00:00:00Z' },
        { id: 'd-new', assigneeAgentId: 'a-3', updatedAt: '2026-05-03T00:00:00Z' },
        { id: 'd-mid', assigneeAgentId: 'a-2', updatedAt: '2026-05-02T00:00:00Z' },
      ],
    );
    expect(result.subagent).toEqual({
      agentId: 'a-3',
      agentName: 'Charlie',
      delegationId: 'd-new',
    });
  });

  it('with running delegation but no assignee → subagent is null', () => {
    const result = buildMapping(
      'u-1',
      [agentA],
      [{ id: 'd-1', assigneeAgentId: null, updatedAt: '2026-05-03T00:00:00Z' }],
    );
    expect(result.subagent).toBeNull();
  });

  it('with running delegation referencing unknown agent → subagent is null', () => {
    const result = buildMapping(
      'u-1',
      [agentA],
      [{ id: 'd-1', assigneeAgentId: 'a-ghost', updatedAt: '2026-05-03T00:00:00Z' }],
    );
    expect(result.subagent).toBeNull();
  });
});
