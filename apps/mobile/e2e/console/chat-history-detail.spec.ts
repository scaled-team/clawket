/**
 * Phase 8 — Chat History Detail screen renders when a row is tapped.
 *
 * This spec depends on the harness fixture having at least one cached
 * chat session to tap. If none is present, the `chat-history-row-*`
 * matcher never resolves and the spec times out — which is the correct
 * failure for AC-14.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `console-menu-item-ChatHistory`
 *   - `chat-history`
 *   - `chat-history-row-*`       — session row (regex match)
 *   - `chat-history-detail`      — detail screen root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('ChatHistoryDetail', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromHistoryList', async () => {
    await tapTab('Console');
    await waitForElement('console-menu-item-ChatHistory');
    await element(by.id('console-menu-item-ChatHistory')).tap();
    await waitForElement('chat-history');
    await waitFor(element(by.id(/^chat-history-row-/)).atIndex(0))
      .toBeVisible()
      .withTimeout(10_000);
    await element(by.id(/^chat-history-row-/)).atIndex(0).tap();
    await waitForElement('chat-history-detail');
    await expectVisible('chat-history-detail');
  });
});
