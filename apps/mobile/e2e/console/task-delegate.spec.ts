/**
 * AC-6 — Task detail Workflow tab starts delegation on an existing task.
 *
 * Flow: Console → Tasks → tap first row → Workflow tab → Start delegation →
 * expect the status label (`task-detail-workflow-status`) to appear within
 * 10 s.
 *
 * testIDs used:
 *   - `task-list-row-{id}`               — row to open
 *   - `task-detail-tab-workflow`         — Workflow tab
 *   - `task-detail-delegate-now`         — Start delegation button
 *   - `task-detail-workflow-status`      — status text after the call resolves
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('task delegate (Delegate)', () => {
  it('delegatesExistingTask', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-TaskList')).tap();
    await waitFor(element(by.id('task-list'))).toBeVisible().withTimeout(10_000);

    await element(by.id(/^task-list-row-/)).atIndex(0).tap();
    await waitFor(element(by.id('task-detail'))).toBeVisible().withTimeout(10_000);

    await element(by.id('task-detail-tab-workflow')).tap();
    await element(by.id('task-detail-delegate-now')).tap();

    await waitFor(element(by.id('task-detail-workflow-status')))
      .toBeVisible()
      .withTimeout(10_000);
    await detoxExpect(element(by.id('task-detail-workflow-status'))).toBeVisible();
  });
});
