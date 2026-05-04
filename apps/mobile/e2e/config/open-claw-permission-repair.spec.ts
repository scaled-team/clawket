/**
 * Phase 8 — OpenClaw Permission Repair screen renders.
 *
 * Flow: Config → OpenClawConfig → One-click repair → expect repair root.
 *
 * testIDs used:
 *   - `tab-Config`
 *   - `config-row-OpenClawConfig`
 *   - `open-claw-config-permission-repair`
 *   - `open-claw-permission-repair`
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('OpenClawPermissionRepair', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromOpenClawConfig', async () => {
    await tapTab('Config');
    await waitForElement('config-row-OpenClawConfig');
    await element(by.id('config-row-OpenClawConfig')).tap();
    await waitForElement('open-claw-config-permission-repair');
    await element(by.id('open-claw-config-permission-repair')).tap();
    await waitForElement('open-claw-permission-repair');
    await expectVisible('open-claw-permission-repair');
  });
});
