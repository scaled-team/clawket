/**
 * Phase 8 — File List screen renders.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `console-menu-item-FileList`
 *   - `file-list`  — screen root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('FileList', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromConsoleMenu', async () => {
    await tapTab('Console');
    await waitForElement('console-menu-item-FileList');
    await element(by.id('console-menu-item-FileList')).tap();
    await waitForElement('file-list');
    await expectVisible('file-list');
  });
});
