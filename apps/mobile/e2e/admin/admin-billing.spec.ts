/**
 * AC-13 — Admin billing screen renders MRR + tier breakdown.
 *
 * testIDs used:
 *   - `console-menu-item-AdminMenu`
 *   - `admin-menu-item-AdminBilling`
 *   - `admin-billing`
 *   - `admin-billing-mrr`
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('admin billing (Delegate)', () => {
  it('showsBillingStats', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-AdminMenu')).tap();
    await waitFor(element(by.id('admin-menu-item-AdminBilling'))).toBeVisible().withTimeout(10_000);
    await element(by.id('admin-menu-item-AdminBilling')).tap();
    await waitFor(element(by.id('admin-billing'))).toBeVisible().withTimeout(10_000);
    await detoxExpect(element(by.id('admin-billing-mrr'))).toBeVisible();
  });
});
