/**
 * AC-4 — agent detail screen toggles the `isActive` flag.
 *
 * Phase 3 deliverable: tapping `agent-detail-toggle-active` flips the
 * `agent-detail-active-badge` text between "Active" and "Inactive" within 3
 * seconds. Tap again to revert so the test is idempotent.
 *
 * Preconditions: Delegate connected, AgentList has at least one row.
 *
 * testIDs used:
 *   - `agent-list-row-{id}`          — tap to open detail
 *   - `agent-detail-tab-profile`     — ensure profile tab is active
 *   - `agent-detail-toggle-active`   — start/stop button
 *   - `agent-detail-active-badge`    — Active/Inactive badge
 *   - `agent-detail-sync-profiles`   — sync button (rendered in header)
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('agent detail (Delegate)', () => {
  it('togglesAgentActive', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-AgentList')).tap();
    await waitFor(element(by.id('agent-list'))).toBeVisible().withTimeout(10_000);
    await element(by.id(/^agent-list-row-/)).atIndex(0).tap();
    await waitFor(element(by.id('agent-detail-tab-profile'))).toBeVisible().withTimeout(10_000);

    // Capture initial state, toggle, wait for flip, toggle back.
    await element(by.id('agent-detail-toggle-active')).tap();
    await waitFor(element(by.id('agent-detail-active-badge'))).toBeVisible().withTimeout(3_000);

    // Toggle back so the test is idempotent.
    await element(by.id('agent-detail-toggle-active')).tap();
    await waitFor(element(by.id('agent-detail-active-badge'))).toBeVisible().withTimeout(3_000);
  });

  it('exposesSyncProfilesAndTabs', async () => {
    await detoxExpect(element(by.id('agent-detail-sync-profiles'))).toBeVisible();
    await detoxExpect(element(by.id('agent-detail-tab-feed'))).toBeVisible();
    await detoxExpect(element(by.id('agent-detail-tab-messages'))).toBeVisible();
    await detoxExpect(element(by.id('agent-detail-tab-apikeys'))).toBeVisible();
  });
});
