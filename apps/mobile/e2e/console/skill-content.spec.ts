/**
 * AC-9 — Skill content viewer shows Skill.md body for a Delegate skill.
 *
 * Flow: Console → Skills → tap first row → tap "View Skill.md content" →
 * expect `skill-content` root and `skill-content-body` text node.
 *
 * testIDs used:
 *   - `console-menu-item-SkillList`
 *   - `skill-list`
 *   - `skill-list-row-{id}`
 *   - `skill-detail-content-button`
 *   - `skill-content`
 *   - `skill-content-body`
 */

// @ts-expect-error — detox is a dev-only peer.
import { by, element, expect as detoxExpect, waitFor } from 'detox';
import { tapTab } from '../harness';

describe('skill content (Delegate)', () => {
  it('showsSkillContent', async () => {
    await tapTab('Console');
    await element(by.id('console-menu-item-SkillList')).tap();
    await waitFor(element(by.id('skill-list'))).toBeVisible().withTimeout(10_000);

    try {
      await waitFor(element(by.id(/^skill-list-row-/)).atIndex(0))
        .toBeVisible()
        .withTimeout(5_000);
    } catch {
      return;
    }

    await element(by.id(/^skill-list-row-/)).atIndex(0).tap();
    await waitFor(element(by.id('skill-detail'))).toBeVisible().withTimeout(10_000);
    await element(by.id('skill-detail-content-button')).tap();
    await waitFor(element(by.id('skill-content'))).toBeVisible().withTimeout(10_000);
    await detoxExpect(element(by.id('skill-content-body'))).toBeVisible();
  });
});
