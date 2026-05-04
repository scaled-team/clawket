/**
 * AC-13 — Admin sessions screen shows active sessions and exposes revoke.
 *
 * testIDs used:
 *   - `console-menu-item-AdminMenu`
 *   - `admin-menu-item-AdminSessions`
 *   - `admin-sessions-list`
 *   - `admin-sessions-row-{id}`
 *   - `admin-sessions-revoke-{id}`
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('admin sessions (Delegate)', () => {
  it('showsSessions', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-AdminMenu')).tap();
    await waitFor(element(by.id('admin-menu-item-AdminSessions'))).toBeVisible().withTimeout(10_000);
    await element(by.id('admin-menu-item-AdminSessions')).tap();
    await waitFor(element(by.id('admin-sessions-list'))).toBeVisible().withTimeout(10_000);
    await detoxExpect(element(by.id(/^admin-sessions-row-/)).atIndex(0)).toBeVisible();
    await detoxExpect(element(by.id(/^admin-sessions-revoke-/)).atIndex(0)).toBeVisible();
  });
});
