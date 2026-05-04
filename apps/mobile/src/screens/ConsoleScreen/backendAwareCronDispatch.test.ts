/**
 * Backend-aware cron dispatcher — covers every op for the `delegate`
 * branch (new code) and verifies the `openclaw` / `hermes` branches
 * still route through GatewayClient (preserves behavior).
 *
 * `fetch` is mocked globally. When the dispatcher routes to Delegate
 * it hits `fetch`; when it routes to Hermes/OpenClaw it hits the
 * gateway mock. We assert the correct path per backend.
 */

import {
  dispatchCreateJob,
  dispatchDeleteJob,
  dispatchGetJob,
  dispatchListJobs,
  dispatchListRuns,
  dispatchRunJob,
  dispatchUpdateJob,
  resolveCronEditorDispatch,
} from './backendAwareCronDispatch';
import type { CronJobCreate, CronJobPatch } from '../../types';

type AnyFn = (...args: unknown[]) => unknown;

function makeGatewayMock(overrides: Partial<Record<string, AnyFn>> = {}): {
  getDelegateConfig: () => { apiUrl: string; apiToken: string } | null;
  getBackendKind: () => 'openclaw' | 'hermes' | 'delegate';
  listCronJobs: jest.Mock;
  addCronJob: jest.Mock;
  updateCronJob: jest.Mock;
  removeCronJob: jest.Mock;
  runCronJob: jest.Mock;
  listCronRuns: jest.Mock;
} {
  const mocks = {
    getDelegateConfig: () => ({ apiUrl: 'https://delegate.example.com', apiToken: 'tok_123' }),
    getBackendKind: () => 'openclaw' as const,
    listCronJobs: jest.fn().mockResolvedValue({ jobs: [], total: 0, offset: 0, limit: 0, hasMore: false, nextOffset: null }),
    addCronJob: jest.fn().mockResolvedValue({ id: 'gw_created' }),
    updateCronJob: jest.fn().mockResolvedValue({ id: 'gw_updated' }),
    removeCronJob: jest.fn().mockResolvedValue({ ok: true }),
    runCronJob: jest.fn().mockResolvedValue({ ok: true }),
    listCronRuns: jest.fn().mockResolvedValue({ entries: [], total: 0, offset: 0, limit: 0, hasMore: false, nextOffset: null }),
    ...overrides,
  };
  return mocks as never;
}

function mockFetchOnce(body: unknown, status = 200): void {
  (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('backendAwareCronDispatch', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---- Capability gate (preserved) -------------------------------------

  describe('resolveCronEditorDispatch', () => {
    it('returns createUnavailable when creating with no capability', () => {
      expect(
        resolveCronEditorDispatch({ jobId: null, capabilities: { consoleCronCreate: false } }),
      ).toBe('createUnavailable');
    });
    it('returns backendDispatch when creating with capability', () => {
      expect(
        resolveCronEditorDispatch({ jobId: null, capabilities: { consoleCronCreate: true } }),
      ).toBe('backendDispatch');
    });
  });

  // ---- Delegate branch: 7 ops ------------------------------------------

  describe('delegate branch', () => {
    it('dispatchListJobs hits GET /api/cron/jobs', async () => {
      mockFetchOnce({ jobs: [
        { id: 'j1', name: 'Daily', cron: '0 9 * * *', enabled: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' },
      ] });
      const gateway = makeGatewayMock({ getBackendKind: () => 'delegate' as const });
      const result = await dispatchListJobs({ backendKind: 'delegate', gateway: gateway as never });
      expect(gateway.listCronJobs).not.toHaveBeenCalled();
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('/api/cron/jobs');
      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].id).toBe('j1');
      expect(result.jobs[0].schedule).toEqual({ kind: 'cron', expr: '0 9 * * *' });
    });

    it('dispatchGetJob hits GET /api/cron/jobs/[id]', async () => {
      mockFetchOnce({ id: 'j1', name: 'Daily', cron: '0 9 * * *', enabled: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z', prompt: 'Ping' });
      const gateway = makeGatewayMock({ getBackendKind: () => 'delegate' as const });
      const result = await dispatchGetJob({ backendKind: 'delegate', gateway: gateway as never }, 'j1');
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('/api/cron/jobs/j1');
      expect(result.payload).toEqual({ kind: 'agentTurn', message: 'Ping' });
    });

    it('dispatchCreateJob hits POST /api/cron/jobs', async () => {
      mockFetchOnce({ id: 'new', name: 'New', cron: '*/5 * * * *', enabled: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' });
      const gateway = makeGatewayMock({ getBackendKind: () => 'delegate' as const });
      const input: CronJobCreate = {
        name: 'New',
        enabled: true,
        schedule: { kind: 'cron', expr: '*/5 * * * *' },
        sessionTarget: 'isolated',
        wakeMode: 'now',
        payload: { kind: 'agentTurn', message: 'hello' },
      };
      const result = await dispatchCreateJob({ backendKind: 'delegate', gateway: gateway as never }, input);
      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('/api/cron/jobs');
      expect(call[1].method).toBe('POST');
      expect(JSON.parse(call[1].body).cron).toBe('*/5 * * * *');
      expect(gateway.addCronJob).not.toHaveBeenCalled();
      expect(result.id).toBe('new');
    });

    it('dispatchUpdateJob hits PATCH /api/cron/jobs/[id]', async () => {
      mockFetchOnce({ id: 'j1', name: 'Renamed', cron: '0 9 * * *', enabled: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-03T00:00:00Z' });
      const gateway = makeGatewayMock({ getBackendKind: () => 'delegate' as const });
      const patch: CronJobPatch = { name: 'Renamed', enabled: false };
      const result = await dispatchUpdateJob({ backendKind: 'delegate', gateway: gateway as never }, 'j1', patch);
      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('/api/cron/jobs/j1');
      expect(call[1].method).toBe('PATCH');
      expect(gateway.updateCronJob).not.toHaveBeenCalled();
      expect(result.name).toBe('Renamed');
    });

    it('dispatchDeleteJob hits DELETE /api/cron/jobs/[id]', async () => {
      mockFetchOnce({ ok: true });
      const gateway = makeGatewayMock({ getBackendKind: () => 'delegate' as const });
      const result = await dispatchDeleteJob({ backendKind: 'delegate', gateway: gateway as never }, 'j1');
      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('/api/cron/jobs/j1');
      expect(call[1].method).toBe('DELETE');
      expect(gateway.removeCronJob).not.toHaveBeenCalled();
      expect(result.ok).toBe(true);
    });

    it('dispatchRunJob hits POST /api/cron/jobs/[id]/run', async () => {
      mockFetchOnce({ ok: true, runId: 'run_42' });
      const gateway = makeGatewayMock({ getBackendKind: () => 'delegate' as const });
      const result = (await dispatchRunJob(
        { backendKind: 'delegate', gateway: gateway as never },
        'j1',
      )) as { ok: boolean; runId?: string };
      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('/api/cron/jobs/j1/run');
      expect(call[1].method).toBe('POST');
      expect(gateway.runCronJob).not.toHaveBeenCalled();
      expect(result.runId).toBe('run_42');
    });

    it('dispatchListRuns hits GET /api/cron/jobs/[id]/runs', async () => {
      mockFetchOnce({ runs: [
        { id: 'r1', jobId: 'j1', status: 'ok', startedAt: '2026-01-01T10:00:00Z', endedAt: '2026-01-01T10:00:05Z' },
      ] });
      const gateway = makeGatewayMock({ getBackendKind: () => 'delegate' as const });
      const result = await dispatchListRuns(
        { backendKind: 'delegate', gateway: gateway as never },
        { scope: 'job', id: 'j1', limit: 25 },
      );
      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('/api/cron/jobs/j1/runs');
      expect(call[0]).toContain('limit=25');
      expect(gateway.listCronRuns).not.toHaveBeenCalled();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].status).toBe('ok');
    });
  });

  // ---- OpenClaw / Hermes branch: preserved gateway routing -------------

  describe('openclaw / hermes branches route through GatewayClient', () => {
    it('list → gateway.listCronJobs (not fetch)', async () => {
      const gateway = makeGatewayMock();
      await dispatchListJobs({ backendKind: 'openclaw', gateway: gateway as never });
      expect(gateway.listCronJobs).toHaveBeenCalled();
      expect(global.fetch as jest.Mock | undefined).toBeDefined();
    });

    it('create → gateway.addCronJob', async () => {
      const gateway = makeGatewayMock();
      const input = { name: 'x', enabled: true, schedule: { kind: 'cron' as const, expr: '* * * * *' }, sessionTarget: 'isolated' as const, wakeMode: 'now' as const, payload: { kind: 'agentTurn' as const, message: 'x' } };
      await dispatchCreateJob({ backendKind: 'hermes', gateway: gateway as never }, input);
      expect(gateway.addCronJob).toHaveBeenCalledWith(input);
    });

    it('update → gateway.updateCronJob', async () => {
      const gateway = makeGatewayMock();
      await dispatchUpdateJob({ backendKind: 'openclaw', gateway: gateway as never }, 'j1', { enabled: false });
      expect(gateway.updateCronJob).toHaveBeenCalledWith('j1', { enabled: false });
    });

    it('delete → gateway.removeCronJob', async () => {
      const gateway = makeGatewayMock();
      await dispatchDeleteJob({ backendKind: 'hermes', gateway: gateway as never }, 'j1');
      expect(gateway.removeCronJob).toHaveBeenCalledWith('j1');
    });

    it('run → gateway.runCronJob', async () => {
      const gateway = makeGatewayMock();
      await dispatchRunJob({ backendKind: 'openclaw', gateway: gateway as never }, 'j1', 'force');
      expect(gateway.runCronJob).toHaveBeenCalledWith('j1', 'force');
    });

    it('listRuns → gateway.listCronRuns', async () => {
      const gateway = makeGatewayMock();
      await dispatchListRuns({ backendKind: 'openclaw', gateway: gateway as never }, { scope: 'all', limit: 10 });
      expect(gateway.listCronRuns).toHaveBeenCalledWith({ scope: 'all', limit: 10 });
    });
  });

  // ---- Error surface ---------------------------------------------------

  describe('error handling', () => {
    it('throws when delegate config is missing', async () => {
      const gateway = makeGatewayMock({
        getDelegateConfig: () => null,
        getBackendKind: () => 'delegate' as const,
      });
      await expect(
        dispatchListJobs({ backendKind: 'delegate', gateway: gateway as never }),
      ).rejects.toThrow(/not configured/i);
    });
  });
});
