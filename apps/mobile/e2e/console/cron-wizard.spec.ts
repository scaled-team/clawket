/**
 * Phase 5 — AC-7 Cron wizard creates a job on Delegate.
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, waitFor } from 'detox';
import { tapTab, waitForElement } from '../harness';

const TIMEOUT_MS = 20_000;

describe('cron wizard', () => {
  it('createsSimpleCron', async () => {
    await tapTab('Console');
    await waitFor(element(by.text('Cron'))).toBeVisible().withTimeout(TIMEOUT_MS);
    await element(by.text('Cron')).tap();
    await waitForElement('cron-list', TIMEOUT_MS);

    await element(by.id('cron-list-create-button')).tap();
    // Wizard renders. We rely on typing the name + cron into whichever
    // inputs the wizard provides (wizard vs editor depending on gate).
    const jobName = 'e2e-cron';

    // The wizard may redirect to the editor for Delegate; target editor ids.
    await waitFor(element(by.id('cron-editor-name-input')))
      .toBeVisible()
      .withTimeout(TIMEOUT_MS)
      .catch(() => null);

    try {
      await element(by.id('cron-editor-name-input')).typeText(jobName);
    } catch {
      // If the wizard is the active screen, type into its first visible name input.
      await element(by.label(/Task name|Name/)).atIndex(0).typeText(jobName);
    }

    // Save — editor has cron-editor-save; wizard has its own save button.
    try {
      await element(by.id('cron-editor-save')).tap();
    } catch {
      await element(by.label(/Save/)).atIndex(0).tap();
    }

    await waitForElement('cron-list', TIMEOUT_MS);
    await waitFor(element(by.text(jobName))).toBeVisible().withTimeout(TIMEOUT_MS);
  });
});
