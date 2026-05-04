/**
 * AC-0 — harness smoke spec.
 *
 * Boots the app and taps through every visible tab. Uses only matchers
 * from harness.ts so failures surface the missing `testID`s rather than
 * opaque Detox traces.
 *
 * NOTE: At Phase 0 this spec is expected to FAIL on a first run because
 * the tab bar buttons in App.tsx / the bottom-tab navigator do not yet
 * expose `testID="tab-<name>"`. Adding those ids is tracked as a
 * Phase-0-followup task (see acceptance report).
 */

import { tapTab, expectTabActive, waitForElement, tabTestId } from '../harness';

describe('app boot smoke', () => {
  it('bootsAndShowsChatTab', async () => {
    // Chat is the default tab on cold start.
    await waitForElement(tabTestId('Chat'));
    await expectTabActive('Chat');
  });

  it('cyclesThroughEveryTab', async () => {
    // Order matches the bottom-tab definition in App.tsx.
    const order = ['Office', 'Console', 'Config', 'Chat'] as const;
    for (const tab of order) {
      await tapTab(tab);
      await expectTabActive(tab);
    }
  });
});
