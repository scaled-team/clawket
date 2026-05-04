/**
 * Phase 8 — Release Notes History screen renders.
 *
 * Flow: Config tab → Release Notes row → expect screen root.
 *
 * testIDs used:
 *   - `tab-Config`                        — tab bar
 *   - `config-row-ReleaseNotesHistory`    — release notes entry row
 *   - `release-notes-history`             — screen root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('ReleaseNotesHistory', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensAndShows', async () => {
    await tapTab('Config');
    await waitForElement('config-row-ReleaseNotesHistory');
    await element(by.id('config-row-ReleaseNotesHistory')).tap();
    await waitForElement('release-notes-history');
    await expectVisible('release-notes-history');
  });
});
