/**
 * Phase 8 — Docs screen renders.
 *
 * testIDs used:
 *   - `tab-Console`
 *   - `console-menu-item-Docs`
 *   - `docs`  — screen root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('Docs', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromConsoleMenu', async () => {
    await tapTab('Console');
    await waitForElement('console-menu-item-Docs');
    await element(by.id('console-menu-item-Docs')).tap();
    await waitForElement('docs');
    await expectVisible('docs');
  });
});
