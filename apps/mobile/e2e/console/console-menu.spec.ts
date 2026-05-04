/**
 * Phase 8 — Console Menu screen renders (root of Console tab).
 *
 * testIDs used:
 *   - `tab-Console`                      — tab bar
 *   - `tab-Console-body`                 — console body root (added by ConsoleMenuScreen)
 *   - `console-menu-item-TaskList`       — one canonical menu entry
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('ConsoleMenu', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('rendersWithMenuItems', async () => {
    await tapTab('Console');
    await waitForElement('tab-Console-body');
    await expectVisible('console-menu-item-TaskList');
  });
});
