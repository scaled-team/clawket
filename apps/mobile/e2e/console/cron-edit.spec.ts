/**
 * Phase 5 — AC-7 Cron edit parity.
 *
 * Opens the first job in the list, renames it, saves, returns to the
 * list, and verifies the renamed job is present.
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, waitFor } from 'detox';
import { tapTab, waitForElement } from '../harness';

const TIMEOUT_MS = 15_000;

describe('cron edit', () => {
  it('editsCronName', async () => {
    await tapTab('Console');
    await waitFor(element(by.text('Cron'))).toBeVisible().withTimeout(TIMEOUT_MS);
    await element(by.text('Cron')).tap();
    await waitForElement('cron-list', TIMEOUT_MS);

    // Pick the first row.
    await waitFor(element(by.id(/^cron-list-row-/)).atIndex(0))
      .toBeVisible()
      .withTimeout(TIMEOUT_MS);
    await element(by.id(/^cron-list-row-/)).atIndex(0).tap();

    // Detail → Edit via the pencil header action. There is no single
    // testID on Edit today; tap the pencil icon via accessibility label.
    await waitFor(element(by.label('Edit'))).toBeVisible().withTimeout(TIMEOUT_MS);
    await element(by.label('Edit')).tap();

    await waitForElement('cron-editor-name-input', TIMEOUT_MS);
    const newName = `e2e-${Date.now()}`;
    await element(by.id('cron-editor-name-input')).clearText();
    await element(by.id('cron-editor-name-input')).typeText(newName);
    await element(by.id('cron-editor-save')).tap();

    await waitForElement('cron-list', TIMEOUT_MS);
    await waitFor(element(by.text(newName))).toBeVisible().withTimeout(TIMEOUT_MS);
  });
});
