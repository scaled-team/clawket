/**
 * Phase 8 — Models screen renders.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `console-menu-item-ModelList`
 *   - `models`  — screen root wrapper
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('Models', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromConsoleMenu', async () => {
    await tapTab('Console');
    await waitForElement('console-menu-item-ModelList');
    await element(by.id('console-menu-item-ModelList')).tap();
    await waitForElement('models');
    await expectVisible('models');
  });
});
