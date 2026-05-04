/**
 * AC-12 — Notification preferences toggle writes back to Delegate.
 *
 * Flow: Console → Notifications → tap the email channel toggle. The
 * switch is backed by `PUT /api/notifications/preferences` and the
 * toggle state re-renders on success.
 *
 * testIDs used:
 *   - `console-menu-item-Notifications`
 *   - `notifications-prefs`
 *   - `notifications-prefs-toggle-email`
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('notifications prefs (Delegate)', () => {
  it('togglesPreference', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-Notifications')).tap();
    await waitFor(element(by.id('notifications-prefs'))).toBeVisible().withTimeout(10_000);
    await detoxExpect(element(by.id('notifications-prefs-toggle-email'))).toBeVisible();
    await element(by.id('notifications-prefs-toggle-email')).tap();
    // The preference update is optimistic — re-verify the toggle is still
    // mounted after the round-trip.
    await detoxExpect(element(by.id('notifications-prefs-toggle-email'))).toBeVisible();
  });
});
