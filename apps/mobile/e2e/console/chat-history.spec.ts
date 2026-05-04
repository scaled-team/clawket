/**
 * Phase 8 — Chat History screen renders.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `console-menu-item-ChatHistory`
 *   - `chat-history`  — screen root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('ChatHistory', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromConsoleMenu', async () => {
    await tapTab('Console');
    await waitForElement('console-menu-item-ChatHistory');
    await element(by.id('console-menu-item-ChatHistory')).tap();
    await waitForElement('chat-history');
    await expectVisible('chat-history');
  });
});
