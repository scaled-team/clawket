/**
 * Phase 2 — AC-2 worktree header visibility.
 *
 * The worktree header is mounted unconditionally when the delegate
 * backend is active; its internal fetch decides whether to render. When
 * the server returns worktree metadata for `delegate:main`, the pill
 * becomes visible. If the backend returns null the component renders
 * nothing and the testID should not be findable.
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

const HEADER_TIMEOUT_MS = 8_000;

describe('chat worktree header', () => {
  it('showsBranch', async () => {
    await tapTab('Chat');
    // The test harness is expected to run against a delegate backend that
    // exposes worktree metadata for the default `delegate:main` channel.
    // If worktree data is absent, the header stays hidden and this spec
    // will time out — which is the correct failure for the AC.
    await waitFor(element(by.id('chat-worktree-header')))
      .toBeVisible()
      .withTimeout(HEADER_TIMEOUT_MS);
    await detoxExpect(element(by.id('chat-worktree-header'))).toBeVisible();
  });
});
