/**
 * Phase 8 — DiscoverTab mounts with its navigator body.
 *
 * testIDs used:
 *   - `tab-Discover`      — tab-bar button
 *   - `tab-Discover-body` — discover body root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('DiscoverTab', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('rendersDiscoverBody', async () => {
    await tapTab('Discover');
    await waitForElement('tab-Discover-body');
    await expectVisible('tab-Discover-body');
  });
});
