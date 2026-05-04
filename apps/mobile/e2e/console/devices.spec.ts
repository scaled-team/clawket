/**
 * Phase 8 — Devices screen renders.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `console-menu-item-Devices`
 *   - `devices`  — screen root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('Devices', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromConsoleMenu', async () => {
    await tapTab('Console');
    await waitForElement('console-menu-item-Devices');
    await element(by.id('console-menu-item-Devices')).tap();
    await waitForElement('devices');
    await expectVisible('devices');
  });
});
