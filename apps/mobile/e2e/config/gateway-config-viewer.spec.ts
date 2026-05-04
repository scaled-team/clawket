/**
 * Phase 8 — Gateway Config Viewer screen renders.
 *
 * Flow: Config → OpenClawConfig → View Config action → expect viewer root.
 *
 * testIDs used:
 *   - `tab-Config`
 *   - `config-row-OpenClawConfig`
 *   - `open-claw-config`
 *   - `open-claw-config-view-config`
 *   - `gateway-config-viewer`
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('GatewayConfigViewer', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromOpenClawConfig', async () => {
    await tapTab('Config');
    await waitForElement('config-row-OpenClawConfig');
    await element(by.id('config-row-OpenClawConfig')).tap();
    await waitForElement('open-claw-config-view-config');
    await element(by.id('open-claw-config-view-config')).tap();
    await waitForElement('gateway-config-viewer');
    await expectVisible('gateway-config-viewer');
  });
});
