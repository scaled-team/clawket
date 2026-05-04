#!/usr/bin/env tsx
/**
 * e2e-coverage-helpers.ts
 *
 * Shared helpers for the spec-coverage scripts. Extracted so both
 * `check-e2e-coverage.ts` (per-screen coverage) and `check-parity.ts`
 * (per-AC coverage) use the same kebab-of-stem matching rules.
 */

import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

export function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

export function kebab(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

/**
 * Given a screen file path (…/AgentListScreen.tsx), produce the set of
 * spec-file stems that would be considered a match. Examples:
 *   AgentListScreen.tsx -> { AgentListScreen, AgentList, agent-list-screen, agent-list }
 */
export function candidateSpecStems(screenFile: string): string[] {
  const b = basename(screenFile, '.tsx'); // e.g. AgentListScreen
  const stripped = b.replace(/Screen$/, ''); // AgentList
  const stems = new Set<string>([b, stripped, kebab(b), kebab(stripped)]);
  return [...stems].filter(Boolean);
}

/**
 * Returns the set of spec stems (basename minus `.spec.ts`) discovered
 * under `e2eRoot`.
 */
export function collectSpecStems(e2eRoot: string): Set<string> {
  return new Set(
    walk(e2eRoot)
      .filter((f) => f.endsWith('.spec.ts'))
      .map((f) => basename(f, '.spec.ts')),
  );
}

/**
 * True iff any of the candidate stems derived from `screenFile` is
 * present in `specStems`. Mirrors the rule used in check-e2e-coverage.
 */
export function hasSpec(screenFile: string, specStems: Set<string>): boolean {
  return candidateSpecStems(screenFile).some((c) => specStems.has(c));
}
