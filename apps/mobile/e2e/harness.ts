/**
 * Shared Detox helpers used across specs.
 *
 * Notes:
 * - All matchers use `by.id()`. Target screens MUST set a `testID` on the
 *   primary interactive element. See the Phase 0 report for the current
 *   gap — tab buttons do not yet expose `testID="tab-<name>"`.
 * - Keep helpers small and dependency-free — they are bundled into every
 *   spec worker.
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';

export type TabName =
  | 'Chat'
  | 'Office'
  | 'Console'
  | 'Config'
  | 'Discover';

const DEFAULT_TIMEOUT_MS = 10_000;

export const tabTestId = (name: TabName): string => `tab-${name}`;

export async function tapTab(name: TabName): Promise<void> {
  const id = tabTestId(name);
  await waitForElement(id);
  await element(by.id(id)).tap();
}

export async function expectVisible(id: string): Promise<void> {
  await detoxExpect(element(by.id(id))).toBeVisible();
}

export async function waitForElement(
  id: string,
  timeout: number = DEFAULT_TIMEOUT_MS,
): Promise<void> {
  await waitFor(element(by.id(id)))
    .toBeVisible()
    .withTimeout(timeout);
}

export async function expectTabActive(name: TabName): Promise<void> {
  // A tab becomes "active" when its body content is rendered. Each tab
  // body MUST expose `testID="tab-<name>-body"` for this helper.
  await expectVisible(`${tabTestId(name)}-body`);
}
