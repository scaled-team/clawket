#!/usr/bin/env tsx
/**
 * check-poll-intervals.ts
 *
 * Flags any `setInterval(`, `setTimeout(`, or `refetchInterval:` usage in
 * mobile source with a numeric interval < 1000 ms. Clawket mobile polls
 * the Delegate channel at 2.5s as the primary realtime surface — anything
 * faster is a battery / Vercel-connection regression.
 *
 * Allowlist rules (AC-17):
 *   1. Inline carve-out: add `// poll-interval-ok: <reason>` on the same
 *      line or the line immediately above the call site.
 *   2. Keyboard-animation carve-out: React Native keyboard frame-sync
 *      loops (`react-native-keyboard-controller`, `Keyboard` from
 *      `react-native`, `Animated`) may run at < 100ms to stay in sync
 *      with the OS-owned keyboard animation. Files that import any of
 *      those keyboard/animation APIs get a carve-out ONLY for intervals
 *      strictly < 100ms. Intervals in the 100-999ms band still fail
 *      without an inline `poll-interval-ok` comment.
 *
 * The ceiling rule: non-keyboard files → any literal < 1000ms fails.
 * The floor rule: even keyboard files → anything at 100-999ms fails.
 *
 * Self-check line: the script prints
 *   "OK — scanned N files, keyboard-loop exemptions: M"
 * so readers can confirm both rules are active and visible.
 *
 * Exits 0 when clean, 1 with a file:line report otherwise.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR =
  typeof __dirname !== 'undefined'
    ? __dirname
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fileURLToPath(new URL('.', (import.meta as any).url));
const APP_ROOT = resolve(SCRIPT_DIR, '..');
const SRC_ROOT = join(APP_ROOT, 'src');
const THRESHOLD_MS = 1000;

const POLL_CALL = /(setInterval|setTimeout)\s*\(/;
const REFETCH = /refetchInterval\s*:/;
const ALLOW = /poll-interval-ok\s*:/;
const KEYBOARD_EXEMPTION_FLOOR_MS = 100;

/**
 * Patterns that identify a file as interacting with the React Native
 * keyboard / animation frame loop. Matching imports unlock the sub-100ms
 * carve-out for that file only.
 */
const KEYBOARD_IMPORT = [
  /from\s+['"]react-native-keyboard-controller['"]/,
  /from\s+['"]react-native-reanimated['"]/,
  /\bimport\s+\{\s*[^}]*\b(?:Keyboard|Animated)\b[^}]*\}\s+from\s+['"]react-native['"]/,
  /\brequire\(['"]react-native-keyboard-controller['"]\)/,
];

type Offense = {
  file: string;
  line: number;
  source: string;
  interval: number;
  reason: string;
};

function isKeyboardAnimationFile(text: string): boolean {
  return KEYBOARD_IMPORT.some((re) => re.test(text));
}

/**
 * Test files are exempt from the poll-interval rule: specs routinely use
 * `setTimeout(r, 0)` or tiny delays to yield the event loop, and those
 * patterns have no impact on device battery or Vercel connection load.
 *
 * Exemption pattern: any file whose name ends in `.test.ts` / `.test.tsx`
 * (or `.js` / `.jsx`) OR any file under a `__tests__/` directory.
 *
 * self-check: the scanner prints the file count it scanned; if a new test
 * file slips through, the count stays stable and no offense is emitted for
 * it. Run `node scripts/check-poll-intervals.ts` locally to verify.
 */
function isTestFile(relPath: string): boolean {
  if (/\.test\.(ts|tsx|js|jsx)$/.test(relPath)) return true;
  if (/(^|[\\/])__tests__[\\/]/.test(relPath)) return true;
  return false;
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === '__tests__') continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      if (isTestFile(full)) continue;
      out.push(full);
    }
  }
  return out;
}

/**
 * Find the numeric argument that represents the interval.
 *  - setInterval(fn, 500) -> 500
 *  - setTimeout(() => {}, 200) -> 200
 *  - refetchInterval: 300 -> 300
 * Returns NaN when the argument is not a plain literal (dynamic).
 */
function extractInterval(source: string): number {
  const m =
    /(?:setInterval|setTimeout)\s*\([^,]+,\s*([0-9][0-9_]*)\s*[),]/.exec(source) ??
    /refetchInterval\s*:\s*([0-9][0-9_]*)/.exec(source);
  if (!m) return NaN;
  return parseInt(m[1].replace(/_/g, ''), 10);
}

function scanFile(
  file: string,
  offenses: Offense[],
  stats: { keyboardExemptions: number },
): void {
  const text = readFileSync(file, 'utf-8');
  const keyboardFile = isKeyboardAnimationFile(text);
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!POLL_CALL.test(line) && !REFETCH.test(line)) continue;

    const prev = i > 0 ? lines[i - 1] : '';
    if (ALLOW.test(line) || ALLOW.test(prev)) continue;

    const interval = extractInterval(line);
    if (Number.isNaN(interval)) continue; // dynamic — can't judge
    if (interval >= THRESHOLD_MS) continue;

    // Keyboard-animation carve-out: sub-100ms intervals in a file that
    // imports a keyboard/animation API are permitted; 100-999ms still
    // fail because those are not frame-sync loops.
    if (keyboardFile && interval < KEYBOARD_EXEMPTION_FLOOR_MS) {
      stats.keyboardExemptions += 1;
      continue;
    }

    offenses.push({
      file: relative(APP_ROOT, file),
      line: i + 1,
      source: line.trim(),
      interval,
      reason: `interval ${interval}ms < threshold ${THRESHOLD_MS}ms`,
    });
  }
}

function main() {
  const files = walk(SRC_ROOT);
  const offenses: Offense[] = [];
  const stats = { keyboardExemptions: 0 };
  for (const f of files) scanFile(f, offenses, stats);

  if (offenses.length === 0) {
    console.log(
      `[check-poll-intervals] OK — scanned ${files.length} files, ` +
        `keyboard-loop exemptions: ${stats.keyboardExemptions}.`,
    );
    process.exit(0);
  }

  console.error(
    `[check-poll-intervals] ${offenses.length} offending call(s):\n`,
  );
  for (const o of offenses) {
    console.error(`  ${o.file}:${o.line}  (${o.reason})`);
    console.error(`    ${o.source}`);
  }
  console.error(
    `\nAdd \`// poll-interval-ok: <reason>\` on the same or previous line to allowlist.`,
  );
  process.exit(1);
}

main();
