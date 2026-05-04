/**
 * AC-5 — Task detail Comments tab posts a comment.
 *
 * Flow: Console → Tasks → tap first row → Comments tab → type a message →
 * send → expect the new `comment-row-*` to be visible.
 *
 * testIDs used:
 *   - `task-list-row-{id}`               — row to open
 *   - `task-detail`                      — detail root
 *   - `task-detail-tab-comments`         — Comments tab
 *   - `comment-composer-input`           — comment text field
 *   - `comment-send`                     — send button
 *   - `comment-row-{id}`                 — each comment row
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('task detail (Delegate)', () => {
  it('showsAndComments', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-TaskList')).tap();
    await waitFor(element(by.id('task-list'))).toBeVisible().withTimeout(10_000);

    await element(by.id(/^task-list-row-/)).atIndex(0).tap();
    await waitFor(element(by.id('task-detail'))).toBeVisible().withTimeout(10_000);

    await element(by.id('task-detail-tab-comments')).tap();

    const suffix = `${Date.now()}`.slice(-6);
    const body = `Detox comment ${suffix}`;
    await element(by.id('comment-composer-input')).typeText(body);
    await element(by.id('comment-send')).tap();

    await waitFor(element(by.id(/^comment-row-/)).atIndex(0))
      .toBeVisible()
      .withTimeout(10_000);
  });
});
