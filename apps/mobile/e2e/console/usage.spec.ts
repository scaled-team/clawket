/**
 * AC-11 — Usage screen shows the user-balance section and top-up picker.
 *
 * Flow: Console → Usage → expect `usage-balance-remaining`, tap Top up,
 * expect pack picker modal, then dismiss.
 *
 * testIDs used:
 *   - `console-menu-item-Usage`  (or tap from stats grid)
 *   - `usage-balance`
 *   - `usage-balance-remaining`
 *   - `usage-topup-button`
 *   - `usage-topup-modal`
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('usage screen (Delegate)', () => {
  it('showsBalanceAndTopup', async () => {
    await tapTab('Console');
    // Reach the Usage screen via the stats grid button.
    await waitFor(element(by.id('usage-balance'))).toBeVisible().withTimeout(10_000);
    await detoxExpect(element(by.id('usage-balance-remaining'))).toBeVisible();
    await element(by.id('usage-topup-button')).tap();
    await waitFor(element(by.id('usage-topup-modal'))).toBeVisible().withTimeout(5_000);
    // Dismiss.
    await element(by.id('usage-topup-modal')).swipe('down');
  });
});
