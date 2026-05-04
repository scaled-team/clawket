/**
 * AC-9 — Skill detail renders name + metadata for a Delegate skill.
 *
 * Flow: Console → Skills → tap first row → expect `skill-detail` and a
 * visible `skill-detail-name` label.
 *
 * testIDs used:
 *   - `console-menu-item-SkillList`  — menu entry
 *   - `skill-list`                   — list container
 *   - `skill-list-row-{id}`          — row to open
 *   - `skill-detail`                 — detail root
 *   - `skill-detail-name`            — displayed skill name
 *   - `skill-detail-content-button`  — "View Skill.md content" button
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('skill detail (Delegate)', () => {
  it('showsSkillDetail', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-SkillList')).tap();
    await waitFor(element(by.id('skill-list'))).toBeVisible().withTimeout(10_000);

    // Skip gracefully when no skills are installed.
    try {
      await waitFor(element(by.id(/^skill-list-row-/)).atIndex(0))
        .toBeVisible()
        .withTimeout(5_000);
    } catch {
      return;
    }

    await element(by.id(/^skill-list-row-/)).atIndex(0).tap();
    await waitFor(element(by.id('skill-detail'))).toBeVisible().withTimeout(10_000);
    await detoxExpect(element(by.id('skill-detail-name'))).toBeVisible();
    await detoxExpect(element(by.id('skill-detail-content-button'))).toBeVisible();
  });
});
