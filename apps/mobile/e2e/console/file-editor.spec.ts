/**
 * Phase 8 — File Editor screen renders when a file row is tapped.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `console-menu-item-FileList`
 *   - `file-list`
 *   - `file-list-row-*`   — file row (regex match)
 *   - `file-editor`       — editor screen root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('FileEditor', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromFileList', async () => {
    await tapTab('Console');
    await waitForElement('console-menu-item-FileList');
    await element(by.id('console-menu-item-FileList')).tap();
    await waitForElement('file-list');
    await waitFor(element(by.id(/^file-list-row-/)).atIndex(0))
      .toBeVisible()
      .withTimeout(10_000);
    await element(by.id(/^file-list-row-/)).atIndex(0).tap();
    await waitForElement('file-editor');
    await expectVisible('file-editor');
  });
});
