/**
 * Phase 5 — AC-7 Cron "Run now".
 *
 * From the detail view, taps "Run now" and waits up to 10s for a new
 * run row to appear in the Run History section.
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, waitFor } from 'detox';
import { tapTab, waitForElement } from '../harness';

const LIST_TIMEOUT_MS = 15_000;
const RUN_TIMEOUT_MS = 10_000;

describe('cron run now', () => {
  it('runsNow', async () => {
    await tapTab('Console');
    await waitFor(element(by.text('Cron'))).toBeVisible().withTimeout(LIST_TIMEOUT_MS);
    await element(by.text('Cron')).tap();
    await waitForElement('cron-list', LIST_TIMEOUT_MS);

    await waitFor(element(by.id(/^cron-list-row-/)).atIndex(0))
      .toBeVisible()
      .withTimeout(LIST_TIMEOUT_MS);
    await element(by.id(/^cron-list-row-/)).atIndex(0).tap();

    await waitForElement('cron-detail-run-now', LIST_TIMEOUT_MS);
    await element(by.id('cron-detail-run-now')).tap();

    // Expect a new run row within 10s.
    await waitFor(element(by.id(/^cron-run-row-/)).atIndex(0))
      .toBeVisible()
      .withTimeout(RUN_TIMEOUT_MS);
  });
});
