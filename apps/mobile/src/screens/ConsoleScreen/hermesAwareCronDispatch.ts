/**
 * Legacy re-export shim.
 *
 * This file used to house `resolveCronEditorDispatch`. Phase 5 of the
 * Clawket × Delegate parity plan moved all Cron dispatch logic into
 * `backendAwareCronDispatch.ts` so the Delegate backend is a peer of
 * OpenClaw / Hermes. We keep this shim so any existing imports
 * (`HermesAwareCronScreens.tsx`, tests) keep compiling without churn.
 */

export {
  resolveCronEditorDispatch,
  type CronEditorDispatchDecision,
} from './backendAwareCronDispatch';
