/**
 * Phase 8 — ChatTab mounts with the chat body.
 *
 * testIDs used:
 *   - `tab-Chat`         — tab-bar button (from Phase 0.1)
 *   - `tab-Chat-body`    — chat body root (from Phase 2)
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('ChatTab', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('rendersChatBody', async () => {
    await tapTab('Chat');
    await waitForElement('tab-Chat-body');
    await expectVisible('tab-Chat-body');
  });
});
