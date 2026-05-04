/**
 * Phase 8 — Node Detail screen renders when a node row is tapped.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `console-menu-item-Nodes`
 *   - `nodes`
 *   - `nodes-row-*`   — node card (regex match)
 *   - `node-detail`   — detail screen root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('NodeDetail', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromNodesList', async () => {
    await tapTab('Console');
    await waitForElement('console-menu-item-Nodes');
    await element(by.id('console-menu-item-Nodes')).tap();
    await waitForElement('nodes');
    await waitFor(element(by.id(/^nodes-row-/)).atIndex(0))
      .toBeVisible()
      .withTimeout(10_000);
    await element(by.id(/^nodes-row-/)).atIndex(0).tap();
    await waitForElement('node-detail');
    await expectVisible('node-detail');
  });
});
