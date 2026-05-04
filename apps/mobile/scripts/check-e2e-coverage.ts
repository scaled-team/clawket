#!/usr/bin/env tsx
/**
 * check-e2e-coverage.ts
 *
 * Enforces that every screen file under `src/screens/` has a matching
 * Detox spec under `e2e/`. A screen file counts if its basename ends in
 * `Screen.tsx` OR matches `{Chat,Office,Console,Config,Discover}Tab.tsx`.
 *
 * Match rules:
 *  - Default: a spec file whose basename (minus `.spec.ts`) matches the
 *    screen basename (minus `.tsx`) case-insensitively, with "Screen"
 *    optionally stripped. Examples:
 *      src/screens/ConsoleScreen/AgentListScreen.tsx
 *        -> e2e/**\/agent-list.spec.ts   (kebab, screen dropped)
 *        -> e2e/**\/AgentListScreen.spec.ts (exact)
 *        -> e2e/**\/AgentList.spec.ts   (pascal, screen dropped)
 *  - `e2e-coverage.json` at the app root can override:
 *      { "skipList": ["FileName.tsx", ...],
 *        "extraMappings": { "FileName.tsx": "e2e/path/to/spec.spec.ts" } }
 *
 * Exits 0 when every non-skipped screen has a spec. Exits 1 with a
 * formatted report otherwise.
 *
 * Phase 0 note: this script is expected to exit non-zero because no
 * specs exist yet apart from the boot smoke. That is the intended gate
 * driving the rest of the parity plan.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, relative, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk, candidateSpecStems, collectSpecStems } from './e2e-coverage-helpers';

// Resolve the directory this script lives in regardless of how it was
// invoked (tsx, ts-node/CJS, ts-node/ESM). When running as a module,
// __dirname is undefined, so fall back to import.meta.url.
const SCRIPT_DIR =
  typeof __dirname !== 'undefined'
    ? __dirname
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fileURLToPath(new URL('.', (import.meta as any).url));
const APP_ROOT = resolve(SCRIPT_DIR, '..');
const SCREENS_ROOT = join(APP_ROOT, 'src', 'screens');
const E2E_ROOT = join(APP_ROOT, 'e2e');
const COVERAGE_JSON = join(APP_ROOT, 'e2e-coverage.json');

type CoverageConfig = {
  skipList?: string[];
  extraMappings?: Record<string, string>;
};

// Built-in skips for screens that are intentionally deferred per the
// parity plan. The JSON file overrides/extends these.
const BUILTIN_SKIP_LIST: string[] = [
  // Shared navigator scaffolds — not a screen surface.
  'sharedNavigator.tsx',
  // Discover tab subscreens (AC-15 explicitly defers content discovery).
  'DiscoverDetailScreen.tsx',
  'DiscoverHomeScreen.tsx',
  'ClawHubBrowseScreen.tsx',
  'SkillsShBrowseScreen.tsx',
  // Office tab overlay is part of OfficeTab and has no standalone entry.
  'OfficeGuideOverlay.tsx',
  // Hermes-prefixed screens are covered by the shared Cron/ Console
  // specs; they are dispatchers, not distinct surfaces.
  'HermesAwareCronScreens.tsx',
  'HermesCronOutputSheetContent.tsx',
  // Modals that are exercised through their host screens.
  'StatsPosterModal.tsx',
  'AppUpdateAnnouncementModal.tsx',
  'ChatSharePosterModal.tsx',
];

function loadConfig(): CoverageConfig {
  if (!existsSync(COVERAGE_JSON)) return {};
  try {
    return JSON.parse(readFileSync(COVERAGE_JSON, 'utf-8'));
  } catch (err) {
    console.error(`[check-e2e-coverage] Failed to parse ${COVERAGE_JSON}:`, err);
    process.exit(2);
  }
}

function isScreenFile(file: string): boolean {
  const b = basename(file);
  if (!b.endsWith('.tsx')) return false;
  if (b.endsWith('Screen.tsx')) return true;
  if (/^(Chat|Office|Console|Config|Discover)Tab\.tsx$/.test(b)) return true;
  return false;
}

function main() {
  const cfg = loadConfig();
  const skipList = new Set<string>([
    ...BUILTIN_SKIP_LIST,
    ...(cfg.skipList ?? []),
  ]);
  const extraMappings = cfg.extraMappings ?? {};

  const allFiles = walk(SCREENS_ROOT);
  const screens = allFiles.filter(isScreenFile);

  const specStems = collectSpecStems(E2E_ROOT);

  const missing: Array<{ screen: string; candidates: string[] }> = [];

  for (const screen of screens) {
    const b = basename(screen);
    if (skipList.has(b)) continue;

    const mapping = extraMappings[b];
    if (mapping) {
      const mapPath = join(APP_ROOT, mapping);
      if (existsSync(mapPath)) continue;
      missing.push({
        screen: relative(APP_ROOT, screen),
        candidates: [mapping + ' (mapped — missing)'],
      });
      continue;
    }

    const candidates = candidateSpecStems(screen);
    const hit = candidates.some((c) => specStems.has(c));
    if (!hit) {
      missing.push({
        screen: relative(APP_ROOT, screen),
        candidates: candidates.map((c) => `e2e/**/${c}.spec.ts`),
      });
    }
  }

  if (missing.length === 0) {
    console.log(
      `[check-e2e-coverage] OK — ${screens.length} screens, all covered ` +
        `(skipped ${skipList.size}).`,
    );
    process.exit(0);
  }

  console.error(
    `[check-e2e-coverage] MISSING ${missing.length} specs ` +
      `(of ${screens.length} screens, ${skipList.size} skipped):\n`,
  );
  for (const m of missing) {
    console.error(`  ${m.screen}`);
    console.error(`    expected one of:`);
    for (const c of m.candidates) console.error(`      - ${c}`);
  }
  process.exit(1);
}

main();
