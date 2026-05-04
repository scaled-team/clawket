/**
 * Phase 8 — Agent Sessions Board screen renders (AC-14 coverage).
 *
 * The richer board assertions live in `sessions-board.spec.ts`. This spec
 * satisfies the check-e2e-coverage filename rule for
 * `AgentSessionsBoardScreen.tsx`, which expects one of
 * `agent-sessions-board*.spec.ts`.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `console-menu-item-AgentSessionsBoard`
 *   - `sessions-board-droplet`       — droplet status card
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('AgentSessionsBoard', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromConsoleMenu', async () => {
    await tapTab('Console');
    await waitForElement('console-menu-item-AgentSessionsBoard');
    await element(by.id('console-menu-item-AgentSessionsBoard')).tap();
    await waitForElement('sessions-board-droplet');
    await expectVisible('sessions-board-droplet');
  });
});
