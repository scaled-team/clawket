/**
 * AC-10 — Board meetings list renders rows or an empty state.
 *
 * Flow: Console → Board Meetings → expect `board-meetings-list` and the
 * header "+" button. Show at least one row OR the empty-state CTA.
 *
 * testIDs used:
 *   - `console-menu-item-BoardMeetings`
 *   - `board-meetings-list`
 *   - `board-meeting-row-{id}`
 *   - `board-meeting-create-button`
 *   - `board-meeting-empty-create`
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('board meetings list (Delegate)', () => {
  it('listsBoardMeetings', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-BoardMeetings')).tap();
    await waitFor(element(by.id('board-meetings-list'))).toBeVisible().withTimeout(10_000);
    await detoxExpect(element(by.id('board-meeting-create-button'))).toBeVisible();

    try {
      await waitFor(element(by.id(/^board-meeting-row-/)).atIndex(0))
        .toBeVisible()
        .withTimeout(5_000);
    } catch {
      await detoxExpect(element(by.id('board-meeting-empty-create'))).toBeVisible();
    }
  });
});
