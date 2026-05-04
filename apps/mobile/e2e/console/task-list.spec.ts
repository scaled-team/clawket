/**
 * AC-5 — Tasks list renders Delegate tasks (or empty state).
 *
 * Phase 4 deliverable: opening `TaskList` with the Delegate backend shows the
 * `task-list` FlatList. If the test account has tasks, at least one row
 * `task-list-row-*` is visible; otherwise the empty-state "Create task" CTA
 * `task-list-empty-create` is visible.
 *
 * testIDs used:
 *   - `console-menu-item-TaskList`       — menu entry
 *   - `task-list`                        — FlatList container
 *   - `task-list-row-{id}`               — each task row
 *   - `task-list-empty-create`           — empty-state CTA
 *   - `task-list-filter-{status}`        — filter chip
 *   - `task-list-create-button`          — header plus button
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('task list (Delegate)', () => {
  it('listsDelegateTasks', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-TaskList')).tap();
    await waitFor(element(by.id('task-list'))).toBeVisible().withTimeout(10_000);
    await detoxExpect(element(by.id('task-list-create-button'))).toBeVisible();
    await detoxExpect(element(by.id('task-list-filter-ALL'))).toBeVisible();

    // Either at least one row, or the empty-state CTA. Detox has no OR matcher
    // so try rows first and fall back silently.
    try {
      await waitFor(element(by.id(/^task-list-row-/)).atIndex(0))
        .toBeVisible()
        .withTimeout(5_000);
    } catch {
      await detoxExpect(element(by.id('task-list-empty-create'))).toBeVisible();
    }
  });
});
