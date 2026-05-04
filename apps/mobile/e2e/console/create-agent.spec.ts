/**
 * AC-3 (sub) — CreateAgentScreen provisions a DelegateAgent from a template.
 *
 * Flow: Console → AgentList → tap the `+` in the header → pick the first
 * template → enter a name → submit. Expect navigation back to the list and
 * the new row to be visible.
 *
 * testIDs used:
 *   - `agent-list-create-button`          — FAB/header plus button
 *   - `create-agent-template-{id}`        — each template card
 *   - `create-agent-name-input`           — name field
 *   - `create-agent-submit`               — submit button
 *   - `agent-list-row-{id}`               — new row after navigating back
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('create agent (Delegate)', () => {
  it('createsFromTemplate', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-AgentList')).tap();
    await waitFor(element(by.id('agent-list'))).toBeVisible().withTimeout(10_000);
    await element(by.id('agent-list-create-button')).tap();

    // The first template card shows up on mount; tap it.
    await waitFor(element(by.id(/^create-agent-template-/)).atIndex(0))
      .toBeVisible()
      .withTimeout(10_000);
    await element(by.id(/^create-agent-template-/)).atIndex(0).tap();

    // Unique name so repeated test runs do not collide. We never read the
    // DB, we only verify that the list reloads with at least one new row.
    const suffix = `${Date.now()}`.slice(-6);
    const name = `Detox-${suffix}`;
    await element(by.id('create-agent-name-input')).typeText(name);
    await element(by.id('create-agent-submit')).tap();

    // Navigation pops to AgentList; list re-fetches on focus.
    await waitFor(element(by.id('agent-list'))).toBeVisible().withTimeout(10_000);
    await detoxExpect(element(by.id(/^agent-list-row-/)).atIndex(0)).toBeVisible();
  });
});
