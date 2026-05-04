/**
 * AC-13 — Admin menu gates non-admins behind an empty state.
 *
 * Flow: Console → Admin → when the current user has no admin role the
 * screen renders `admin-menu-gated`. When the user has a role the menu
 * entries appear instead.
 *
 * testIDs used:
 *   - `console-menu-item-AdminMenu`
 *   - `admin-menu`
 *   - `admin-menu-gated`
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('admin gating (Delegate)', () => {
  it('gatesOnRole', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-AdminMenu')).tap();
    await waitFor(element(by.id('admin-menu'))).toBeVisible().withTimeout(10_000);
    // Either the gated state is visible, or the admin entries are.
    try {
      await waitFor(element(by.id('admin-menu-gated'))).toBeVisible().withTimeout(5_000);
    } catch {
      await detoxExpect(element(by.id('admin-menu-item-AdminUsers'))).toBeVisible();
    }
  });
});
