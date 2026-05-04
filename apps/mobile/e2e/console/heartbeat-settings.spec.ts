/**
 * Phase 8 — Heartbeat Settings screen renders.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `console-menu-item-HeartbeatSettings`
 *   - `heartbeat-settings`  — screen root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('HeartbeatSettings', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromConsoleMenu', async () => {
    await tapTab('Console');
    await waitForElement('console-menu-item-HeartbeatSettings');
    await element(by.id('console-menu-item-HeartbeatSettings')).tap();
    await waitForElement('heartbeat-settings');
    await expectVisible('heartbeat-settings');
  });
});
