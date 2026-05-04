/**
 * AC-13 — Admin workspaces screen lists workspaces from /api/admin/workspaces.
 *
 * testIDs used:
 *   - `console-menu-item-AdminMenu`
 *   - `admin-menu-item-AdminWorkspaces`
 *   - `admin-workspaces-list`
 *   - `admin-workspaces-row-{id}`
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('admin workspaces (Delegate)', () => {
  it('listsWorkspaces', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-AdminMenu')).tap();
    await waitFor(element(by.id('admin-menu-item-AdminWorkspaces'))).toBeVisible().withTimeout(10_000);
    await element(by.id('admin-menu-item-AdminWorkspaces')).tap();
    await waitFor(element(by.id('admin-workspaces-list'))).toBeVisible().withTimeout(10_000);
    await detoxExpect(element(by.id(/^admin-workspaces-row-/)).atIndex(0)).toBeVisible();
  });
});
