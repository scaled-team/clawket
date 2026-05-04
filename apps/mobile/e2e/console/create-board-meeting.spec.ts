/**
 * AC-10 — Board-meeting create form renders with testIDs.
 *
 * Phase 6 ships the form scaffold only; the Save button is intentionally
 * disabled until the mobile adapter gains a `createBoardMeeting` wrapper
 * (tracked as a Phase 7 follow-up). This spec verifies the fields are
 * present and the Save control is visible even while disabled.
 *
 * testIDs used:
 *   - `console-menu-item-BoardMeetings`
 *   - `board-meetings-list`
 *   - `board-meeting-create-button`
 *   - `create-board-meeting`
 *   - `create-board-meeting-name-input`
 *   - `create-board-meeting-description-input`
 *   - `create-board-meeting-schedule-input`
 *   - `create-board-meeting-submit`
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('create board meeting (Delegate)', () => {
  it('rendersFormScaffold', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-BoardMeetings')).tap();
    await waitFor(element(by.id('board-meetings-list'))).toBeVisible().withTimeout(10_000);
    await element(by.id('board-meeting-create-button')).tap();
    await waitFor(element(by.id('create-board-meeting'))).toBeVisible().withTimeout(10_000);
    await detoxExpect(element(by.id('create-board-meeting-name-input'))).toBeVisible();
    await detoxExpect(element(by.id('create-board-meeting-description-input'))).toBeVisible();
    await detoxExpect(element(by.id('create-board-meeting-schedule-input'))).toBeVisible();
    await detoxExpect(element(by.id('create-board-meeting-submit'))).toBeVisible();
  });
});
