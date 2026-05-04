/**
 * Phase 8 — OpenClaw Diagnostics screen renders.
 *
 * Flow: Config → OpenClawConfig → Status Diagnostics → expect diagnostics root.
 *
 * testIDs used:
 *   - `tab-Config`
 *   - `config-row-OpenClawConfig`
 *   - `open-claw-config-diagnostics`
 *   - `open-claw-diagnostics`
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('OpenClawDiagnostics', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromOpenClawConfig', async () => {
    await tapTab('Config');
    await waitForElement('config-row-OpenClawConfig');
    await element(by.id('config-row-OpenClawConfig')).tap();
    await waitForElement('open-claw-config-diagnostics');
    await element(by.id('open-claw-config-diagnostics')).tap();
    await waitForElement('open-claw-diagnostics');
    await expectVisible('open-claw-diagnostics');
  });
});
