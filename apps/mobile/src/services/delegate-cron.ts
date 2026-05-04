/**
 * Typed service wrappers for Delegate cron endpoints.
 *
 * Endpoints mirrored:
 *   GET    /api/cron/jobs
 *   GET    /api/cron/jobs/[id]
 *   POST   /api/cron/jobs
 *   PATCH  /api/cron/jobs/[id]
 *   DELETE /api/cron/jobs/[id]
 *   POST   /api/cron/jobs/[id]/run
 *   GET    /api/cron/jobs/[id]/runs
 */

import { type DelegateConnectionConfig, normalizeUrl } from './delegate-http-adapter';

export type CronJobRow = {
  id: string;
  name: string;
  cron: string;
  enabled: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CronJobDetail = CronJobRow & {
  description?: string | null;
  taskDescription?: string | null;
  prompt?: string | null;
  agentId?: string | null;
  timezone?: string | null;
};

export type CronRun = {
  id: string;
  jobId: string;
  status: string;
  startedAt: string;
  endedAt?: string | null;
  output?: string | null;
  error?: string | null;
};

export type CreateCronJobInput = {
  name: string;
  cron: string;
  description?: string;
  taskDescription?: string;
  prompt?: string;
  agentId?: string;
  enabled?: boolean;
  timezone?: string;
};

function authHeaders(config: DelegateConnectionConfig, json = false): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiToken}`,
  };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

async function unwrap<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) throw new Error(`${label} failed: ${res.status}`);
  const json = await res.json();
  return (json.data ?? json) as T;
}

export async function listCronJobs(
  config: DelegateConnectionConfig,
): Promise<{ jobs: CronJobRow[] }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/cron/jobs`;
  const res = await fetch(url, { headers: authHeaders(config) });
  const data = await unwrap<CronJobRow[] | { jobs: CronJobRow[] }>(res, 'listCronJobs');
  const jobs = Array.isArray(data) ? data : data.jobs ?? [];
  return { jobs };
}

export async function getCronJob(
  config: DelegateConnectionConfig,
  id: string,
): Promise<CronJobDetail> {
  const url = `${normalizeUrl(config.apiUrl)}/api/cron/jobs/${encodeURIComponent(id)}`;
  const res = await fetch(url, { headers: authHeaders(config) });
  return unwrap<CronJobDetail>(res, 'getCronJob');
}

export async function createCronJob(
  config: DelegateConnectionConfig,
  input: CreateCronJobInput,
): Promise<CronJobDetail> {
  const url = `${normalizeUrl(config.apiUrl)}/api/cron/jobs`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(config, true),
    body: JSON.stringify(input),
  });
  return unwrap<CronJobDetail>(res, 'createCronJob');
}

export async function updateCronJob(
  config: DelegateConnectionConfig,
  id: string,
  patch: Partial<CreateCronJobInput>,
): Promise<CronJobDetail> {
  const url = `${normalizeUrl(config.apiUrl)}/api/cron/jobs/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders(config, true),
    body: JSON.stringify(patch),
  });
  return unwrap<CronJobDetail>(res, 'updateCronJob');
}

export async function deleteCronJob(
  config: DelegateConnectionConfig,
  id: string,
): Promise<{ ok: boolean }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/cron/jobs/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: authHeaders(config),
  });
  if (!res.ok) throw new Error(`deleteCronJob failed: ${res.status}`);
  return { ok: true };
}

export async function runCronJob(
  config: DelegateConnectionConfig,
  id: string,
): Promise<{ ok: boolean; runId?: string }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/cron/jobs/${encodeURIComponent(id)}/run`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(config, true),
    body: JSON.stringify({}),
  });
  return unwrap<{ ok: boolean; runId?: string }>(res, 'runCronJob');
}

export async function listCronRuns(
  config: DelegateConnectionConfig,
  id: string,
  params?: { limit?: number; offset?: number },
): Promise<{ runs: CronRun[]; total?: number }> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.offset != null) search.set('offset', String(params.offset));
  const qs = search.toString();
  const url = `${normalizeUrl(config.apiUrl)}/api/cron/jobs/${encodeURIComponent(id)}/runs${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: authHeaders(config) });
  if (!res.ok) throw new Error(`listCronRuns failed: ${res.status}`);
  const json = await res.json();
  const data = json.data ?? json;
  const runs = Array.isArray(data) ? data : data.runs ?? [];
  return { runs, total: json.meta?.total };
}
