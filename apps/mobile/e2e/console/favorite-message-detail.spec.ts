/**
 * Phase 8 — Favorite Message Detail screen renders when a favorite is tapped.
 *
 * The Favorites tab in Chat History lists starred messages. Tapping one
 * opens the detail. If no favorites exist the favorite row matcher never
 * resolves — that is the correct AC failure mode.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `console-menu-item-ChatHistory`
 *   - `chat-history`
 *   - `chat-history-favorite-*`  — favorite row (regex match)
 *   - `favorite-message-detail`  — detail screen root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('FavoriteMessageDetail', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromFavoriteRow', async () => {
    await tapTab('Console');
    await waitForElement('console-menu-item-ChatHistory');
    await element(by.id('console-menu-item-ChatHistory')).tap();
    await waitForElement('chat-history');
    // Switch to Favorites tab (text-based; no testID for tab body yet).
    await element(by.text('Favorites')).tap();
    await waitFor(element(by.id(/^chat-history-favorite-/)).atIndex(0))
      .toBeVisible()
      .withTimeout(10_000);
    await element(by.id(/^chat-history-favorite-/)).atIndex(0).tap();
    await waitForElement('favorite-message-detail');
    await expectVisible('favorite-message-detail');
  });
});
