/**
 * Phase 5 — AC-7 Cron list parity.
 *
 * Opens Console → Cron and asserts either a job row or the empty state
 * renders. The spec only targets testIDs declared in Phase 5
 * (`cron-list`, `cron-list-row-*`, or the translated empty-state label)
 * so it works against any seeded Delegate backend.
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, waitFor } from 'detox';
import { tapTab, waitForElement } from '../harness';

const TIMEOUT_MS = 15_000;

describe('cron list', () => {
  it('listsDelegateCronJobs', async () => {
    await tapTab('Console');
    // Navigate into Cron. The Console menu entry is a static row; we
    // rely on the existing "Cron" label until a dedicated testID lands.
    await waitFor(element(by.text('Cron'))).toBeVisible().withTimeout(TIMEOUT_MS);
    await element(by.text('Cron')).tap();

    await waitForElement('cron-list', TIMEOUT_MS);
    // Either at least one row is visible OR the empty-state icon renders.
    await waitFor(
      element(by.id(/^cron-list-row-/)).atIndex(0),
    )
      .toBeVisible()
      .withTimeout(TIMEOUT_MS)
      .catch(async () => {
        // Fall back to empty-state assertion — icon is the only stable anchor.
        await waitFor(element(by.text(/No cron jobs|No runs yet/i)))
          .toBeVisible()
          .withTimeout(TIMEOUT_MS);
      });
  });
});
