import {
  listCronJobs,
  getCronJob,
  createCronJob,
  updateCronJob,
  deleteCronJob,
  runCronJob,
  listCronRuns,
} from './delegate-cron';

const CONFIG = { apiUrl: 'https://delegate.test', apiToken: 'tok-cron' };

function mockFetchJson(body: unknown, status = 200) {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('delegate-cron', () => {
  describe('listCronJobs', () => {
    it('GETs /api/cron/jobs', async () => {
      const spy = mockFetchJson({ data: [{ id: 'c1', name: 'Daily', cron: '0 9 * * *', enabled: true, createdAt: 't', updatedAt: 't' }], success: true });
      const result = await listCronJobs(CONFIG);
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/cron/jobs');
      expect((spy.mock.calls[0][1] as RequestInit).headers).toEqual({ Authorization: 'Bearer tok-cron' });
      expect(result.jobs).toHaveLength(1);
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(listCronJobs(CONFIG)).rejects.toThrow(/listCronJobs failed: 500/);
    });
  });

  describe('getCronJob', () => {
    it('fetches a single job', async () => {
      const spy = mockFetchJson({ data: { id: 'c1', name: 'Daily', cron: '0 9 * * *', enabled: true, createdAt: 't', updatedAt: 't' }, success: true });
      await getCronJob(CONFIG, 'c1');
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/cron/jobs/c1');
    });

    it('throws on 404', async () => {
      mockFetchJson({}, 404);
      await expect(getCronJob(CONFIG, 'missing')).rejects.toThrow(/getCronJob failed: 404/);
    });
  });

  describe('createCronJob', () => {
    it('POSTs input', async () => {
      const spy = mockFetchJson({ data: { id: 'c9', name: 'n', cron: '* * * * *', enabled: true, createdAt: 't', updatedAt: 't' }, success: true });
      await createCronJob(CONFIG, { name: 'n', cron: '* * * * *' });
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ name: 'n', cron: '* * * * *' }));
    });

    it('throws on 400', async () => {
      mockFetchJson({}, 400);
      await expect(createCronJob(CONFIG, { name: '', cron: '' })).rejects.toThrow(/createCronJob failed: 400/);
    });
  });

  describe('updateCronJob', () => {
    it('PATCHes with partial patch', async () => {
      const spy = mockFetchJson({ data: { id: 'c1', name: 'n', cron: '* * * * *', enabled: false, createdAt: 't', updatedAt: 't' }, success: true });
      await updateCronJob(CONFIG, 'c1', { enabled: false });
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('PATCH');
      expect(init.body).toBe(JSON.stringify({ enabled: false }));
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(updateCronJob(CONFIG, 'c1', { enabled: true })).rejects.toThrow(/updateCronJob failed: 500/);
    });
  });

  describe('deleteCronJob', () => {
    it('DELETEs the job', async () => {
      const spy = mockFetchJson({ success: true });
      await deleteCronJob(CONFIG, 'c1');
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('DELETE');
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(deleteCronJob(CONFIG, 'c1')).rejects.toThrow(/deleteCronJob failed: 500/);
    });
  });

  describe('runCronJob', () => {
    it('POSTs to /run with empty body', async () => {
      const spy = mockFetchJson({ data: { ok: true, runId: 'r1' }, success: true });
      const result = await runCronJob(CONFIG, 'c1');
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/cron/jobs/c1/run');
      expect(result.runId).toBe('r1');
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(runCronJob(CONFIG, 'c1')).rejects.toThrow(/runCronJob failed: 500/);
    });
  });

  describe('listCronRuns', () => {
    it('fetches runs with pagination', async () => {
      const spy = mockFetchJson({
        data: [{ id: 'r1', jobId: 'c1', status: 'success', startedAt: 't' }],
        meta: { total: 5 },
        success: true,
      });
      const result = await listCronRuns(CONFIG, 'c1', { limit: 20 });
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/api/cron/jobs/c1/runs?');
      expect(url).toContain('limit=20');
      expect(result.total).toBe(5);
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(listCronRuns(CONFIG, 'c1')).rejects.toThrow(/listCronRuns failed: 500/);
    });
  });
});
