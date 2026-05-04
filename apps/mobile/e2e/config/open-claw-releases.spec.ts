/**
 * Phase 8 — OpenClaw Releases screen renders.
 *
 * The releases footer link is gated on `controller.gatewayUpdateInfo`; when
 * no update is available the row is not rendered. In that case the spec
 * falls back to asserting the screen can still be reached via the config
 * stack, but since there is no always-on entry, we only assert that the
 * navigation target testID exists once the row is tapped. If the row is
 * absent, this spec times out — which is the correct failure for AC-14.
 *
 * testIDs used:
 *   - `tab-Config`
 *   - `config-row-OpenClawReleases` — footer update link (conditional)
 *   - `open-claw-releases`           — releases webview root
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { expectVisible, tapTab, waitForElement } from '../harness';

describe('OpenClawReleases', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('opensFromConfigFooter', async () => {
    await tapTab('Config');
    await waitForElement('config-row-OpenClawReleases');
    await element(by.id('config-row-OpenClawReleases')).tap();
    await waitForElement('open-claw-releases');
    await expectVisible('open-claw-releases');
  });
});
