/**
 * Phase 2 — AC-2 live progress strip.
 *
 * After a send, the strip polls `/api/agent/channel/progress` at 2.5s
 * and becomes visible once the first progress event arrives. When the
 * agent reply lands, `isRunActive` flips to false and the strip hides.
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, waitFor } from 'detox';
import { tapTab, waitForElement } from '../harness';

const STRIP_VISIBLE_TIMEOUT_MS = 8_000;
const STRIP_HIDE_TIMEOUT_MS = 60_000;

describe('chat progress strip', () => {
  it('showsLiveProgress', async () => {
    await tapTab('Chat');
    await waitForElement('chat-composer-input');

    await element(by.id('chat-composer-input')).typeText('what is 2 + 2?');
    await element(by.id('chat-send-button')).tap();

    // Strip should appear within ~5s (first progress event + one poll
    // cycle of 2.5s). Allow 8s of slack for CI jitter.
    await waitFor(element(by.id('chat-progress-strip')))
      .toBeVisible()
      .withTimeout(STRIP_VISIBLE_TIMEOUT_MS);

    // Once the agent finishes, `runActive` flips false and the strip
    // tears itself down. Give it a generous window since replies depend
    // on backend latency.
    await waitFor(element(by.id('chat-progress-strip')))
      .toBeNotVisible()
      .withTimeout(STRIP_HIDE_TIMEOUT_MS);
  });
});
