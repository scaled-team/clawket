/**
 * AC-8 — agent sessions board renders Delegate groups.
 *
 * Phase 3 deliverable: opening `AgentSessionsBoard` with the Delegate backend
 * shows the droplet status card, the server health card, and at least one
 * group entry.
 *
 * testIDs used:
 *   - `sessions-board-droplet`       — droplet status card
 *   - `sessions-board-health`        — server health card
 *   - `sessions-board-group-{jid}`   — each group entry
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('agent sessions board (Delegate)', () => {
  it('rendersDelegateGroups', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-AgentSessionsBoard')).tap();
    await waitFor(element(by.id('sessions-board-droplet'))).toBeVisible().withTimeout(10_000);
    await detoxExpect(element(by.id('sessions-board-health'))).toBeVisible();
    await detoxExpect(element(by.id(/^sessions-board-group-/)).atIndex(0)).toBeVisible();
  });
});
