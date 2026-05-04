/**
 * Phase 8 — Log screen renders.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `console-menu-item-Logs`
 *   - `log`  — screen root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('Log', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromConsoleMenu', async () => {
    await tapTab('Console');
    await waitForElement('console-menu-item-Logs');
    await element(by.id('console-menu-item-Logs')).tap();
    await waitForElement('log');
    await expectVisible('log');
  });
});
