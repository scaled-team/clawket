/**
 * Phase 8 — Nodes screen renders.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `console-menu-item-Nodes`
 *   - `nodes`  — screen root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('Nodes', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromConsoleMenu', async () => {
    await tapTab('Console');
    await waitForElement('console-menu-item-Nodes');
    await element(by.id('console-menu-item-Nodes')).tap();
    await waitForElement('nodes');
    await expectVisible('nodes');
  });
});
