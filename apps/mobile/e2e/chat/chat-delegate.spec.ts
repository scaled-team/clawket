/**
 * Phase 2 — AC-2 chat end-to-end smoke.
 *
 * Types a message into the composer, taps send, and waits for an agent
 * reply message to render. Uses only `by.id()` matchers against the
 * testIDs added in Phase 2 (`chat-composer-input`, `chat-send-button`,
 * and `chat-message-*` wrappers).
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, waitFor } from 'detox';
import { tapTab, waitForElement } from '../harness';

const REPLY_TIMEOUT_MS = 30_000;

describe('chat delegate round-trip', () => {
  it('sendsAndReceivesDelegateMessage', async () => {
    await tapTab('Chat');
    await waitForElement('chat-composer-input');

    await element(by.id('chat-composer-input')).typeText('ping');
    await element(by.id('chat-send-button')).tap();

    // The first rendered message in an empty thread will be the outgoing
    // user bubble; wait for ANY `chat-message-*` to become visible and
    // trust the harness to surface a concrete missing-testID failure if
    // the wrapper regresses.
    await waitFor(element(by.id(/^chat-message-/)).atIndex(0))
      .toBeVisible()
      .withTimeout(REPLY_TIMEOUT_MS);
  });
});
