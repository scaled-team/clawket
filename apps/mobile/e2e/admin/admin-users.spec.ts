/**
 * AC-13 — Admin users screen lists users from /api/admin/users.
 *
 * testIDs used:
 *   - `console-menu-item-AdminMenu`
 *   - `admin-menu-item-AdminUsers`
 *   - `admin-users-list`
 *   - `admin-users-row-{id}`
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('admin users (Delegate)', () => {
  it('listsUsers', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-AdminMenu')).tap();
    await waitFor(element(by.id('admin-menu-item-AdminUsers'))).toBeVisible().withTimeout(10_000);
    await element(by.id('admin-menu-item-AdminUsers')).tap();
    await waitFor(element(by.id('admin-users-list'))).toBeVisible().withTimeout(10_000);
    await detoxExpect(element(by.id(/^admin-users-row-/)).atIndex(0)).toBeVisible();
  });
});
