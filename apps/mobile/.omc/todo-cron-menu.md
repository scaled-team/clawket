# TODO: Cron menu entry for Delegate backend

Phase 5 (`backendAwareCronDispatch.ts`) wired Cron CRUD to all three backends.
The `ConsoleMenuScreen.tsx` file was intentionally not touched here because
Phase 3 is editing it in parallel.

Follow-up (Phase 3 owner):
- When `backendKind === 'delegate'`, add a "Cron" entry to the Console menu
  that navigates to `CronList` (same target as OpenClaw/Hermes).
- Confirm the entry respects `consoleCron` capability (already `true` in
  `DELEGATE_CAPABILITIES`).
- Add `testID="console-menu-cron"` to the row for e2e navigation tests.

Context:
- Dispatcher: `src/screens/ConsoleScreen/backendAwareCronDispatch.ts`
- Screens using dispatcher: `CronListScreen`, `CronEditorScreen`,
  `CronDetailScreen`, `CronWizardScreen` (all four updated in Phase 5).
