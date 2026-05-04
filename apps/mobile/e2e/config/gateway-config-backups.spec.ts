/**
 * Phase 8 — Gateway Config Backups screen renders.
 *
 * Flow: Config → OpenClawConfig → Restore Backup → expect backups root.
 *
 * testIDs used:
 *   - `tab-Config`
 *   - `config-row-OpenClawConfig`
 *   - `open-claw-config-restore-backup`
 *   - `gateway-config-backups`
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('GatewayConfigBackups', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromOpenClawConfig', async () => {
    await tapTab('Config');
    await waitForElement('config-row-OpenClawConfig');
    await element(by.id('config-row-OpenClawConfig')).tap();
    await waitForElement('open-claw-config-restore-backup');
    await element(by.id('open-claw-config-restore-backup')).tap();
    await waitForElement('gateway-config-backups');
    await expectVisible('gateway-config-backups');
  });
});
