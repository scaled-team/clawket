/**
 * Phase 8 — Cron Detail screen renders when a cron row is tapped.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `cron-list`              — cron list root (from existing spec)
 *   - `cron-list-row-*`        — cron row
 *   - `cron-detail`            — detail screen root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

const TIMEOUT_MS = 15_000;

describe('CronDetail', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromCronList', async () => {
    await tapTab('Console');
    await waitFor(element(by.text('Cron'))).toBeVisible().withTimeout(TIMEOUT_MS);
    await element(by.text('Cron')).tap();
    await waitForElement('cron-list', TIMEOUT_MS);
    await waitFor(element(by.id(/^cron-list-row-/)).atIndex(0))
      .toBeVisible()
      .withTimeout(TIMEOUT_MS);
    await element(by.id(/^cron-list-row-/)).atIndex(0).tap();
    await waitForElement('cron-detail', TIMEOUT_MS);
    await expectVisible('cron-detail');
  });
});
