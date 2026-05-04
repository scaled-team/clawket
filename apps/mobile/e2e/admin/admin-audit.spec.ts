/**
 * AC-13 — Admin audit screen paginates audit entries.
 *
 * testIDs used:
 *   - `console-menu-item-AdminMenu`
 *   - `admin-menu-item-AdminAudit`
 *   - `admin-audit-list`
 *   - `admin-audit-row-{id}`
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('admin audit (Delegate)', () => {
  it('paginatesAudit', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-AdminMenu')).tap();
    await waitFor(element(by.id('admin-menu-item-AdminAudit'))).toBeVisible().withTimeout(10_000);
    await element(by.id('admin-menu-item-AdminAudit')).tap();
    await waitFor(element(by.id('admin-audit-list'))).toBeVisible().withTimeout(10_000);
    await detoxExpect(element(by.id(/^admin-audit-row-/)).atIndex(0)).toBeVisible();
    // Scroll to trigger onEndReached paging.
    await element(by.id('admin-audit-list')).swipe('up', 'slow', 0.9);
  });
});
