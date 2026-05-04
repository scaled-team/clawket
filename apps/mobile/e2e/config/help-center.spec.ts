/**
 * Phase 8 — Help Center screen renders.
 *
 * Flow: Config tab → Help Center row → expect screen root.
 *
 * testIDs used:
 *   - `tab-Config`              — tab bar
 *   - `config-row-HelpCenter`   — help entry row
 *   - `help-center`             — screen root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('HelpCenter', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensAndShows', async () => {
    await tapTab('Config');
    await waitForElement('config-row-HelpCenter');
    await element(by.id('config-row-HelpCenter')).tap();
    await waitForElement('help-center');
    await expectVisible('help-center');
  });
});
