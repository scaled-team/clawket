/**
 * AC-3 — agent list renders Delegate agents.
 *
 * Phase 3 deliverable: the Agent List screen on a Delegate backend shows at
 * least one row with testID matching `agent-list-row-*` after the app reaches
 * `connectionState === 'ready'`.
 *
 * Preconditions: the harness has already walked `ConfigScreen` to connect to
 * Delegate (see `e2e/config/connect-delegate.spec.ts`) and the test account
 * has at least one AgentProfile.
 *
 * NOTE: This spec targets Phase-3 testIDs:
 *   - `agent-list` — FlatList container
 *   - `agent-list-row-{id}` — each row
 *   - `agent-list-create-button` — plus button in the header
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('agent list (Delegate)', () => {
  it('rendersDelegateAgents', async () => {
    await tapTab('Console');
    // Navigate: ConsoleMenu → AgentList. The menu entry uses a menu-item id;
    // keep the spec robust by targeting the container once it mounts.
    await element(by.id('console-menu-item-AgentList')).tap();
    await waitFor(element(by.id('agent-list'))).toBeVisible().withTimeout(10_000);
    // At least one row must be visible. Use atIndex(0) so the matcher
    // succeeds even when multiple rows render.
    await detoxExpect(element(by.id(/^agent-list-row-/)).atIndex(0)).toBeVisible();
  });

  it('showsCreateButton', async () => {
    await detoxExpect(element(by.id('agent-list-create-button'))).toBeVisible();
  });
});
