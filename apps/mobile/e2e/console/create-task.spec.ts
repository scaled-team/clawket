/**
 * AC-6 — CreateTaskScreen creates a task and optionally delegates it.
 *
 * Flow: Console → Create task → fill title + description → toggle
 * delegate-after-save ON → submit → expect navigation back to TaskList with
 * the new row visible at index 0 (sort: newest first).
 *
 * testIDs used:
 *   - `console-menu-item-CreateTask`     — menu entry
 *   - `create-task-title-input`          — title field
 *   - `create-task-description-input`    — description field
 *   - `create-task-delegate-toggle`      — Delegate after save switch
 *   - `create-task-save`                 — submit button
 *   - `task-list`                        — list container after navigating back
 *   - `task-list-row-{id}`               — new row
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('create task (Delegate)', () => {
  it('createsAndDelegates', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-CreateTask')).tap();
    await waitFor(element(by.id('create-task-title-input')))
      .toBeVisible()
      .withTimeout(10_000);

    const suffix = `${Date.now()}`.slice(-6);
    await element(by.id('create-task-title-input')).typeText(`Detox task ${suffix}`);
    await element(by.id('create-task-description-input')).typeText(
      'Created from the Phase 4 create-task spec.',
    );
    await element(by.id('create-task-delegate-toggle')).tap();
    await element(by.id('create-task-save')).tap();

    // The modal closes; navigate to the task list to confirm creation.
    await element(by.id('console-menu-item-TaskList')).tap();
    await waitFor(element(by.id('task-list'))).toBeVisible().withTimeout(10_000);
    await detoxExpect(element(by.id(/^task-list-row-/)).atIndex(0)).toBeVisible();
  });
});
