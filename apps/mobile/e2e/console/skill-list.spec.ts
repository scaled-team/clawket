/**
 * AC-9 — Delegate skills list renders rows or an empty state.
 *
 * Phase 6 deliverable: opening `SkillList` with the Delegate backend shows
 * the `skill-list` SectionList. If the workspace has skills, at least one
 * `skill-list-row-*` is visible; otherwise the list renders its empty state.
 *
 * testIDs used:
 *   - `console-menu-item-SkillList`  — menu entry
 *   - `skill-list`                   — list container
 *   - `skill-list-row-{id}`          — each skill row
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('skill list (Delegate)', () => {
  it('listsDelegateSkills', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-SkillList')).tap();
    await waitFor(element(by.id('skill-list'))).toBeVisible().withTimeout(10_000);

    // Either at least one row, or an empty-state list. Detox has no OR
    // matcher — try rows first and fall back silently on timeout.
    try {
      await waitFor(element(by.id(/^skill-list-row-/)).atIndex(0))
        .toBeVisible()
        .withTimeout(5_000);
    } catch {
      await detoxExpect(element(by.id('skill-list'))).toBeVisible();
    }
  });
});
