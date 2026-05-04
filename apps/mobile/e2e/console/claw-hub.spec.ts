/**
 * Phase 8 — ClawHub screen renders.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `console-menu-item-ClawHub`
 *   - `claw-hub`  — screen root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('ClawHub', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromConsoleMenu', async () => {
    await tapTab('Console');
    await waitForElement('console-menu-item-ClawHub');
    await element(by.id('console-menu-item-ClawHub')).tap();
    await waitForElement('claw-hub');
    await expectVisible('claw-hub');
  });
});
