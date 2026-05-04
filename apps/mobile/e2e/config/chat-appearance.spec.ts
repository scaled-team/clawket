/**
 * Phase 8 — Chat Appearance screen renders preview card.
 *
 * Flow: Config tab → Chat Appearance row → expect preview card.
 *
 * testIDs used:
 *   - `tab-Config`                — tab bar
 *   - `config-row-ChatAppearance` — appearance entry row
 *   - `chat-appearance`           — screen root
 *   - `chat-appearance-preview`   — preview card
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('ChatAppearance', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensAndShowsPreview', async () => {
    await tapTab('Config');
    await waitForElement('config-row-ChatAppearance');
    await element(by.id('config-row-ChatAppearance')).tap();
    await waitForElement('chat-appearance');
    await expectVisible('chat-appearance-preview');
  });
});
