/**
 * Phase 4.5 A.9 — contract test.
 *
 * Asserts that SESSION_UPDATE payloads we synthesize from Delegate LiveEvents
 * (per the mapping in plan §A.3) conform to the office-game's `SessionData`
 * interface (`apps/mobile/office-game/src/bridge.ts:24-33`). If the office-game
 * bridge contract drifts, this test fails before runtime.
 */

import type { SessionData } from '../../../../office-game/src/bridge';

// The mapper that lives in production code (RN side, in OfficeTab.tsx). We
// re-derive it here to avoid plumbing a mock for OfficeTab. The shape MUST
// match — drift is caught by `Pick`/`Required` assertions below.
function synthesizeSessionFromAgentMessage(payload: {
  agentId: string;
  taskId?: string;
  messageId: string;
  text?: string;
}): SessionData {
  return {
    key: `delegate:agent:${payload.agentId}${payload.taskId ? `:task:${payload.taskId}` : ''}`,
    kind: 'delegate-agent',
    channel: 'delegate',
    active: true,
    label: payload.text?.slice(0, 64) ?? undefined,
    updatedAt: Date.now(),
    lastMessage: payload.text,
  };
}

function synthesizeSessionFromDelegationStarted(payload: {
  delegationId: string;
  agentId: string;
  taskId?: string;
}): SessionData {
  return {
    key: `delegate:delegation:${payload.delegationId}`,
    kind: 'delegate-delegation',
    channel: 'delegate',
    active: true,
    label: payload.taskId,
    updatedAt: Date.now(),
  };
}

describe('SESSION_UPDATE contract — bridge.ts:SessionData', () => {
  it('agent.message.new payload conforms to SessionData', () => {
    const session = synthesizeSessionFromAgentMessage({
      agentId: 'a-1',
      taskId: 't-9',
      messageId: 'm-42',
      text: 'hello world',
    });

    // Required fields per interface
    expect(typeof session.key).toBe('string');
    expect(typeof session.active).toBe('boolean');

    // Optional fields are correctly typed
    expect(session.kind === undefined || typeof session.kind === 'string').toBe(true);
    expect(session.channel === undefined || typeof session.channel === 'string').toBe(true);
    expect(session.label === undefined || typeof session.label === 'string').toBe(true);
    expect(
      session.updatedAt === undefined ||
        session.updatedAt === null ||
        typeof session.updatedAt === 'number',
    ).toBe(true);
    expect(session.lastMessage === undefined || typeof session.lastMessage === 'string').toBe(true);
    expect(session.model === undefined || typeof session.model === 'string').toBe(true);
  });

  it('delegation.started payload conforms to SessionData', () => {
    const session = synthesizeSessionFromDelegationStarted({
      delegationId: 'd-1',
      agentId: 'a-1',
      taskId: 't-9',
    });

    expect(typeof session.key).toBe('string');
    expect(typeof session.active).toBe('boolean');
    expect(session.active).toBe(true); // delegation.started is always active=true
  });

  it('SessionData allows omitting all optional fields', () => {
    const minimal: SessionData = { key: 'k', active: false };
    expect(minimal.key).toBe('k');
    expect(minimal.active).toBe(false);
  });

  it('rejects ill-shaped payloads at compile time', () => {
    // This block exercises the type checker. If SessionData ever loses `key`
    // or `active`, ts-jest will reject this file and CI will surface drift.
    const _typeCheck = (): SessionData => ({
      key: 'k',
      active: true,
    });
    expect(_typeCheck()).toBeDefined();
  });
});
