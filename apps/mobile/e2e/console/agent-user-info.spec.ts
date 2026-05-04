/**
 * Phase 8 — Agent User Info screen renders.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `console-menu-item-AgentUserInfo`
 *   - `agent-user-info`  — screen root (loading / error / loaded variants)
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('AgentUserInfo', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromConsoleMenu', async () => {
    await tapTab('Console');
    await waitForElement('console-menu-item-AgentUserInfo');
    await element(by.id('console-menu-item-AgentUserInfo')).tap();
    await waitForElement('agent-user-info');
    await expectVisible('agent-user-info');
  });
});
