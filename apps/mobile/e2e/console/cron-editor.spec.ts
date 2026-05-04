/**
 * Phase 8 — Cron Editor screen renders when editing a cron job.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `cron-list`
 *   - `cron-list-row-*`
 *   - `cron-editor`                — editor screen root
 *   - `cron-editor-name-input`     — name field (verifies editor mounted)
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

const TIMEOUT_MS = 15_000;

describe('CronEditor', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromCronDetail', async () => {
    await tapTab('Console');
    await waitFor(element(by.text('Cron'))).toBeVisible().withTimeout(TIMEOUT_MS);
    await element(by.text('Cron')).tap();
    await waitForElement('cron-list', TIMEOUT_MS);
    await waitFor(element(by.id(/^cron-list-row-/)).atIndex(0))
      .toBeVisible()
      .withTimeout(TIMEOUT_MS);
    await element(by.id(/^cron-list-row-/)).atIndex(0).tap();
    await waitForElement('cron-detail', TIMEOUT_MS);
    await waitFor(element(by.label('Edit'))).toBeVisible().withTimeout(TIMEOUT_MS);
    await element(by.label('Edit')).tap();
    await waitForElement('cron-editor', TIMEOUT_MS);
    await expectVisible('cron-editor-name-input');
  });
});
