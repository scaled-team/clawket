/**
 * Phase 8 — OpenClaw Config screen renders.
 *
 * Flow: Config tab → OPENCLAW CONFIG row → expect screen root + View Config row.
 *
 * testIDs used:
 *   - `tab-Config`                     — tab bar
 *   - `config-row-OpenClawConfig`      — entry row
 *   - `open-claw-config`               — screen root
 *   - `open-claw-config-view-config`   — view-config action row
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('OpenClawConfig', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensAndShowsViewConfigRow', async () => {
    await tapTab('Config');
    await waitForElement('config-row-OpenClawConfig');
    await element(by.id('config-row-OpenClawConfig')).tap();
    await waitForElement('open-claw-config');
    await expectVisible('open-claw-config-view-config');
  });
});
