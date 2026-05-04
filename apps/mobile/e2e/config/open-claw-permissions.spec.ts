/**
 * Phase 8 — OpenClaw Permissions screen renders.
 *
 * Flow: Config → OpenClawConfig → Permission Management → expect permissions root.
 *
 * testIDs used:
 *   - `tab-Config`
 *   - `config-row-OpenClawConfig`
 *   - `open-claw-config-permissions`
 *   - `open-claw-permissions`
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('OpenClawPermissions', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromOpenClawConfig', async () => {
    await tapTab('Config');
    await waitForElement('config-row-OpenClawConfig');
    await element(by.id('config-row-OpenClawConfig')).tap();
    await waitForElement('open-claw-config-permissions');
    await element(by.id('open-claw-config-permissions')).tap();
    await waitForElement('open-claw-permissions');
    await expectVisible('open-claw-permissions');
  });
});
