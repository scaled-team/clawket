/**
 * Phase 8 — Tools screen renders.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `console-menu-item-ToolList`
 *   - `tools`  — screen root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('Tools', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromConsoleMenu', async () => {
    await tapTab('Console');
    await waitForElement('console-menu-item-ToolList');
    await element(by.id('console-menu-item-ToolList')).tap();
    await waitForElement('tools');
    await expectVisible('tools');
  });
});
