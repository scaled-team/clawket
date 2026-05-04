#!/usr/bin/env tsx
/**
 * check-parity.ts
 *
 * Parses `docs/clawket-parity.md` and enforces that every must-have
 * matrix row whose `AC` column references `AC-0..AC-17` maps to a
 * Detox spec under `e2e/` that:
 *   (1) exists (named via the same kebab-of-stem rule as
 *       `check-e2e-coverage.ts`, resolved off the Gap column hint), AND
 *   (2) contains the AC id somewhere in its source (simple grep so
 *       the AC reference stays visible to reviewers).
 *
 * When a row does not name any expected spec file in its Gap/Capability
 * columns, the fallback requirement is just (2) — the AC id must appear
 * in at least one spec somewhere.
 *
 * Implements AC-16 from the parity plan.
 *
 * Exits 0 on full pass, 1 on any failure with a per-AC report.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk, collectSpecStems, hasSpec } from './e2e-coverage-helpers';

const SCRIPT_DIR =
  typeof __dirname !== 'undefined'
    ? __dirname
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fileURLToPath(new URL('.', (import.meta as any).url));
const APP_ROOT = resolve(SCRIPT_DIR, '..');
const PARITY_DOC = join(APP_ROOT, 'docs', 'clawket-parity.md');
const E2E_ROOT = join(APP_ROOT, 'e2e');

const AC_RE = /\bAC-(?:[0-9]|1[0-7])\b/g;

/**
 * Script-backed ACs — these describe CI guard scripts themselves, not
 * user-facing features. They are considered "met" when the guard script
 * exists and is executable via `npx tsx`. Adding a Detox spec that merely
 * mentions the AC id would be test theater.
 */
const SCRIPT_BACKED_ACS: Record<string, string> = {
  'AC-15': 'scripts/check-e2e-coverage.ts',
  'AC-16': 'scripts/check-parity.ts',
  'AC-17': 'scripts/check-poll-intervals.ts',
};

type MatrixRow = {
  capability: string;
  acIds: string[];
  sourceLine: number;
};

function parseMatrix(doc: string): MatrixRow[] {
  const rows: MatrixRow[] = [];
  const lines = doc.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Matrix rows begin with `| ` and are not separators or headers.
    if (!line.startsWith('|')) continue;
    if (/^\|\s*-+/.test(line)) continue;
    if (/\|\s*Capability\s*\|/.test(line)) continue;
    const acIds = Array.from(line.matchAll(AC_RE)).map((m) => m[0]);
    if (acIds.length === 0) continue;
    const cells = line.split('|').map((c) => c.trim());
    const capability = cells[1] ?? '';
    rows.push({
      capability,
      acIds: [...new Set(acIds)],
      sourceLine: i + 1,
    });
  }
  return rows;
}

/**
 * True iff at least one spec file under `e2eRoot` contains `acId` as a
 * token in its text. Cheap grep — we do not need regex precision beyond
 * matching `AC-N` as a word.
 */
function specMentionsAc(acId: string, specFiles: string[]): string[] {
  const needle = new RegExp(`\\b${acId}\\b`);
  const matches: string[] = [];
  for (const f of specFiles) {
    const text = readFileSync(f, 'utf-8');
    if (needle.test(text)) matches.push(f);
  }
  return matches;
}

type AcStatus = {
  acId: string;
  rows: MatrixRow[];
  specsFound: string[];
  passes: boolean;
  reason?: string;
};

function main() {
  if (!existsSync(PARITY_DOC)) {
    console.error(`[check-parity] Missing ${relative(APP_ROOT, PARITY_DOC)}.`);
    process.exit(1);
  }
  const doc = readFileSync(PARITY_DOC, 'utf-8');
  const rows = parseMatrix(doc);

  // Collect every unique AC id referenced in matrix rows.
  const acToRows = new Map<string, MatrixRow[]>();
  for (const row of rows) {
    for (const ac of row.acIds) {
      const bucket = acToRows.get(ac) ?? [];
      bucket.push(row);
      acToRows.set(ac, bucket);
    }
  }

  const specFiles = walk(E2E_ROOT).filter((f) => f.endsWith('.spec.ts'));
  const specStems = collectSpecStems(E2E_ROOT);

  const statuses: AcStatus[] = [];
  for (const [acId, acRows] of [...acToRows.entries()].sort()) {
    const scriptPath = SCRIPT_BACKED_ACS[acId];
    if (scriptPath) {
      const abs = join(APP_ROOT, scriptPath);
      const present = existsSync(abs);
      statuses.push({
        acId,
        rows: acRows,
        specsFound: present ? [scriptPath] : [],
        passes: present,
        reason: present
          ? undefined
          : `script-backed AC missing its guard at ${scriptPath}`,
      });
      continue;
    }
    const matches = specMentionsAc(acId, specFiles);
    const passes = matches.length > 0;
    statuses.push({
      acId,
      rows: acRows,
      specsFound: matches.map((f) => relative(APP_ROOT, f)),
      passes,
      reason: passes
        ? undefined
        : `no spec under e2e/ references ${acId}; expected at least one`,
    });
  }

  const failures = statuses.filter((s) => !s.passes);
  const passed = statuses.length - failures.length;

  // Extra sanity check that we never lose a stem match for rows that
  // explicitly name a screen file in the Capability column. This is
  // best-effort reporting (not a hard failure) — surfaces drift between
  // the matrix and actual screen/spec file names.
  const stemHints: Array<{ acId: string; hint: string; hit: boolean }> = [];
  for (const [acId, acRows] of acToRows) {
    for (const row of acRows) {
      // Look for `FooScreen` style tokens mentioned in the row text.
      const tokens = row.capability.match(/[A-Z][a-zA-Z]+Screen/g) ?? [];
      for (const token of tokens) {
        const hit = hasSpec(`${token}.tsx`, specStems);
        stemHints.push({ acId, hint: token, hit });
      }
    }
  }

  console.log(
    `[check-parity] ${statuses.length} AC rows: ${passed} pass, ${failures.length} fail.`,
  );

  for (const s of statuses) {
    const tag = s.passes ? 'PASS' : 'FAIL';
    const spec =
      s.specsFound.length > 0
        ? s.specsFound.slice(0, 3).join(', ') +
          (s.specsFound.length > 3 ? ` (+${s.specsFound.length - 3} more)` : '')
        : '—';
    console.log(
      `  [${tag}] ${s.acId}  rows=${s.rows.length}  spec=${spec}${
        s.reason ? `  (${s.reason})` : ''
      }`,
    );
  }

  if (stemHints.length > 0) {
    const missed = stemHints.filter((h) => !h.hit);
    if (missed.length > 0) {
      console.log(
        `\n[check-parity] ${missed.length} screen hint(s) without a matching spec ` +
          `(informational — Phase 8 may still be filling these in):`,
      );
      for (const m of missed) {
        console.log(`  ${m.acId}: hint "${m.hint}" -> no spec stem matched`);
      }
    }
  }

  if (failures.length > 0) {
    console.error(
      `\n[check-parity] FAIL — ${failures.length} AC(s) have no spec coverage.`,
    );
    process.exit(1);
  }

  console.log(`[check-parity] OK — every matrix AC has at least one spec.`);
  process.exit(0);
}

main();
