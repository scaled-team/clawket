/**
 * Phase 8 — Channels screen renders.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `console-menu-item-Channels`
 *   - `channels`  — screen root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('Channels', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromConsoleMenu', async () => {
    await tapTab('Console');
    await waitForElement('console-menu-item-Channels');
    await element(by.id('console-menu-item-Channels')).tap();
    await waitForElement('channels');
    await expectVisible('channels');
  });
});
