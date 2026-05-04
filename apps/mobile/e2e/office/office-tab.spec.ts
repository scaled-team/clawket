/**
 * Phase 8 — OfficeTab mounts and shows the office body.
 *
 * testIDs used:
 *   - `tab-Office`      — tab-bar button
 *   - `tab-Office-body` — office body root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('OfficeTab', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('rendersOfficeBody', async () => {
    await tapTab('Office');
    await waitForElement('tab-Office-body');
    await expectVisible('tab-Office-body');
  });
});
