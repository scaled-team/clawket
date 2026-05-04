/**
 * Backend-aware Cron dispatcher.
 *
 * Phase 5 of the Clawket × Delegate parity plan. Adds a Delegate branch to
 * every cron CRUD / run / history operation so the existing 4 Cron screens
 * (`CronListScreen`, `CronEditorScreen`, `CronDetailScreen`,
 * `CronWizardScreen`) work for all three backends.
 *
 * This file REPLACES `hermesAwareCronDispatch.ts`. The old module now
 * re-exports from here so any untouched imports keep compiling.
 *
 * Design notes:
 * - For `openclaw` and `hermes`, every op routes to the existing
 *   `GatewayClient` cron methods — behavior is byte-identical to the
 *   pre-Phase-5 path.
 * - For `delegate`, every op routes to the typed `delegate-cron` service
 *   and the response is normalized to the existing `CronJob` / `CronListResult`
 *   / `CronRunsResult` shapes so screens don't need deep refactors.
 * - The `resolveCronEditorDispatch` capability gate is preserved unchanged.
 */

import { useCallback, useMemo } from 'react';
import type { GatewayClient } from '../../services/gateway';
import type { GatewayBackendKind } from '../../types';
import type { GatewayBackendCapabilities } from '../../services/gateway-backends';
import {
  createCronJob as delegateCreate,
  deleteCronJob as delegateDelete,
  getCronJob as delegateGet,
  listCronJobs as delegateList,
  listCronRuns as delegateListRuns,
  runCronJob as delegateRun,
  updateCronJob as delegateUpdate,
  type CronJobDetail as DelegateCronJobDetail,
  type CronJobRow as DelegateCronJobRow,
  type CronRun as DelegateCronRun,
  type CreateCronJobInput as DelegateCreateInput,
} from '../../services/delegate-cron';
import type {
  CronJob,
  CronJobCreate,
  CronJobPatch,
  CronListResult,
  CronRunLogEntry,
  CronRunsResult,
} from '../../types';

// ---- Capability gate (preserved from hermesAwareCronDispatch) -----------

export type CronEditorDispatchDecision = 'createUnavailable' | 'backendDispatch';

/**
 * Returns `'createUnavailable'` only when the current navigation request
 * is a *create* (no `jobId`) and the backend's capability registry flags
 * `consoleCronCreate: false`. Otherwise returns `'backendDispatch'`.
 */
export function resolveCronEditorDispatch(input: {
  jobId: string | null | undefined;
  capabilities: Pick<GatewayBackendCapabilities, 'consoleCronCreate'>;
}): CronEditorDispatchDecision {
  const isCreate = !input.jobId;
  if (isCreate && !input.capabilities.consoleCronCreate) {
    return 'createUnavailable';
  }
  return 'backendDispatch';
}

// ---- Delegate → CronJob normalization -----------------------------------

function toEpochMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function normalizeDelegateRow(row: DelegateCronJobRow | DelegateCronJobDetail): CronJob {
  const detail = row as Partial<DelegateCronJobDetail>;
  const prompt = detail.prompt ?? detail.taskDescription ?? '';
  return {
    id: row.id,
    agentId: detail.agentId ?? undefined,
    name: row.name,
    description: detail.description ?? undefined,
    enabled: !!row.enabled,
    createdAtMs: toEpochMs(row.createdAt),
    updatedAtMs: toEpochMs(row.updatedAt),
    schedule: { kind: 'cron', expr: row.cron, ...(detail.timezone ? { tz: detail.timezone } : {}) },
    sessionTarget: 'isolated',
    wakeMode: 'now',
    payload: { kind: 'agentTurn', message: prompt },
    delivery: { mode: 'none' },
    state: {
      nextRunAtMs: toEpochMs(row.nextRunAt ?? null),
      lastRunAtMs: toEpochMs(row.lastRunAt ?? null),
    },
  };
}

function denormalizeCreate(input: CronJobCreate): DelegateCreateInput {
  const cron = input.schedule.kind === 'cron' ? input.schedule.expr : '';
  const prompt = input.payload.kind === 'agentTurn' ? input.payload.message : input.payload.text;
  return {
    name: input.name,
    cron,
    description: input.description,
    prompt,
    taskDescription: prompt,
    agentId: input.agentId ?? undefined,
    enabled: input.enabled,
    timezone: input.schedule.kind === 'cron' ? input.schedule.tz : undefined,
  };
}

function denormalizePatch(patch: CronJobPatch): Partial<DelegateCreateInput> {
  const out: Partial<DelegateCreateInput> = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.description !== undefined) out.description = patch.description;
  if (patch.enabled !== undefined) out.enabled = patch.enabled;
  if (patch.schedule?.kind === 'cron') {
    out.cron = patch.schedule.expr;
    if (patch.schedule.tz !== undefined) out.timezone = patch.schedule.tz;
  }
  if (patch.payload?.kind === 'agentTurn') {
    out.prompt = patch.payload.message;
    out.taskDescription = patch.payload.message;
  } else if (patch.payload?.kind === 'systemEvent') {
    out.prompt = patch.payload.text;
    out.taskDescription = patch.payload.text;
  }
  if (patch.agentId !== undefined) out.agentId = patch.agentId ?? undefined;
  return out;
}

function normalizeDelegateRun(run: DelegateCronRun): CronRunLogEntry {
  const startedMs = toEpochMs(run.startedAt);
  const endedMs = toEpochMs(run.endedAt ?? null);
  const status = run.status === 'ok' || run.status === 'success'
    ? 'ok'
    : run.status === 'error' || run.status === 'failed'
      ? 'error'
      : run.status === 'skipped' ? 'skipped' : undefined;
  return {
    ts: startedMs,
    jobId: run.jobId,
    action: 'finished',
    status,
    error: run.error ?? undefined,
    summary: run.output ?? undefined,
    runAtMs: startedMs,
    durationMs: endedMs && startedMs ? endedMs - startedMs : undefined,
  };
}

// ---- Dispatcher ops ------------------------------------------------------

export type CronDispatcherContext = {
  backendKind: GatewayBackendKind;
  gateway: GatewayClient;
};

export async function dispatchListJobs(
  ctx: CronDispatcherContext,
  params?: {
    includeDisabled?: boolean;
    limit?: number;
    offset?: number;
    query?: string;
    enabled?: 'all' | 'enabled' | 'disabled';
    sortBy?: 'nextRunAtMs' | 'updatedAtMs' | 'name';
    sortDir?: 'asc' | 'desc';
  },
): Promise<CronListResult> {
  if (ctx.backendKind === 'delegate') {
    const config = ctx.gateway.getDelegateConfig();
    if (!config) throw new Error('Delegate backend not configured');
    const { jobs } = await delegateList(config);
    const normalized = jobs.map(normalizeDelegateRow);
    return {
      jobs: normalized,
      total: normalized.length,
      offset: 0,
      limit: normalized.length,
      hasMore: false,
      nextOffset: null,
    };
  }
  return ctx.gateway.listCronJobs(params);
}

export async function dispatchGetJob(
  ctx: CronDispatcherContext,
  id: string,
): Promise<CronJob> {
  if (ctx.backendKind === 'delegate') {
    const config = ctx.gateway.getDelegateConfig();
    if (!config) throw new Error('Delegate backend not configured');
    const detail = await delegateGet(config, id);
    return normalizeDelegateRow(detail);
  }
  // Hermes/OpenClaw don't expose a dedicated get endpoint in GatewayClient —
  // callers currently use `findCronJobById` which pages through listCronJobs.
  const page = await ctx.gateway.listCronJobs({ includeDisabled: true, limit: 100, offset: 0 });
  const found = page.jobs.find((j) => j.id === id);
  if (!found) throw new Error(`Cron job ${id} not found`);
  return found;
}

export async function dispatchCreateJob(
  ctx: CronDispatcherContext,
  input: CronJobCreate,
): Promise<CronJob> {
  if (ctx.backendKind === 'delegate') {
    const config = ctx.gateway.getDelegateConfig();
    if (!config) throw new Error('Delegate backend not configured');
    const detail = await delegateCreate(config, denormalizeCreate(input));
    return normalizeDelegateRow(detail);
  }
  return ctx.gateway.addCronJob(input);
}

export async function dispatchUpdateJob(
  ctx: CronDispatcherContext,
  id: string,
  patch: CronJobPatch,
): Promise<CronJob> {
  if (ctx.backendKind === 'delegate') {
    const config = ctx.gateway.getDelegateConfig();
    if (!config) throw new Error('Delegate backend not configured');
    const detail = await delegateUpdate(config, id, denormalizePatch(patch));
    return normalizeDelegateRow(detail);
  }
  return ctx.gateway.updateCronJob(id, patch);
}

export async function dispatchDeleteJob(
  ctx: CronDispatcherContext,
  id: string,
): Promise<{ ok: boolean }> {
  if (ctx.backendKind === 'delegate') {
    const config = ctx.gateway.getDelegateConfig();
    if (!config) throw new Error('Delegate backend not configured');
    return delegateDelete(config, id);
  }
  return ctx.gateway.removeCronJob(id);
}

export async function dispatchRunJob(
  ctx: CronDispatcherContext,
  id: string,
  mode: 'due' | 'force' = 'force',
): Promise<{ ok: boolean; runId?: string } | unknown> {
  if (ctx.backendKind === 'delegate') {
    const config = ctx.gateway.getDelegateConfig();
    if (!config) throw new Error('Delegate backend not configured');
    return delegateRun(config, id);
  }
  return ctx.gateway.runCronJob(id, mode);
}

export async function dispatchListRuns(
  ctx: CronDispatcherContext,
  params: {
    scope?: 'job' | 'all';
    id?: string;
    limit?: number;
    offset?: number;
    sortDir?: 'asc' | 'desc';
  },
): Promise<CronRunsResult> {
  if (ctx.backendKind === 'delegate') {
    const config = ctx.gateway.getDelegateConfig();
    if (!config) throw new Error('Delegate backend not configured');
    if (params.scope === 'all' || !params.id) {
      // Delegate has no cross-job runs endpoint; return empty result.
      return { entries: [], total: 0, offset: 0, limit: params.limit ?? 0, hasMore: false, nextOffset: null };
    }
    const { runs } = await delegateListRuns(config, params.id, {
      limit: params.limit,
      offset: params.offset,
    });
    const entries = runs.map(normalizeDelegateRun);
    return {
      entries,
      total: entries.length,
      offset: params.offset ?? 0,
      limit: params.limit ?? entries.length,
      hasMore: false,
      nextOffset: null,
    };
  }
  return ctx.gateway.listCronRuns(params);
}

// ---- React hook facade ---------------------------------------------------

export type BackendAwareCronApi = {
  backendKind: GatewayBackendKind;
  listJobs: (params?: Parameters<typeof dispatchListJobs>[1]) => Promise<CronListResult>;
  getJob: (id: string) => Promise<CronJob>;
  createJob: (input: CronJobCreate) => Promise<CronJob>;
  updateJob: (id: string, patch: CronJobPatch) => Promise<CronJob>;
  deleteJob: (id: string) => Promise<{ ok: boolean }>;
  runJob: (id: string, mode?: 'due' | 'force') => Promise<unknown>;
  listRuns: (params: Parameters<typeof dispatchListRuns>[1]) => Promise<CronRunsResult>;
};

/**
 * Hook that resolves the gateway + backend kind and returns stable
 * dispatcher functions. Screens call `useBackendAwareCron()` once and
 * then call `listJobs()`, `runJob()`, etc. without caring which backend
 * the user is connected to.
 */
export function useBackendAwareCron(gateway: GatewayClient): BackendAwareCronApi {
  const backendKind = gateway.getBackendKind();
  const ctx = useMemo<CronDispatcherContext>(() => ({ backendKind, gateway }), [backendKind, gateway]);

  const listJobs = useCallback((params?: Parameters<typeof dispatchListJobs>[1]) => dispatchListJobs(ctx, params), [ctx]);
  const getJob = useCallback((id: string) => dispatchGetJob(ctx, id), [ctx]);
  const createJob = useCallback((input: CronJobCreate) => dispatchCreateJob(ctx, input), [ctx]);
  const updateJob = useCallback((id: string, patch: CronJobPatch) => dispatchUpdateJob(ctx, id, patch), [ctx]);
  const deleteJob = useCallback((id: string) => dispatchDeleteJob(ctx, id), [ctx]);
  const runJob = useCallback((id: string, mode?: 'due' | 'force') => dispatchRunJob(ctx, id, mode), [ctx]);
  const listRuns = useCallback((params: Parameters<typeof dispatchListRuns>[1]) => dispatchListRuns(ctx, params), [ctx]);

  return { backendKind, listJobs, getJob, createJob, updateJob, deleteJob, runJob, listRuns };
}
