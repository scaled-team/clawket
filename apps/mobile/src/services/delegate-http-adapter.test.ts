import {
  fetchDelegateProgress,
  fetchDelegateWorktree,
  fetchUserUsage,
  postUsageTopup,
  normalizeUrl,
} from './delegate-http-adapter';

const CONFIG = { apiUrl: 'https://delegate.test/', apiToken: 'tok-http' };

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

describe('delegate-http-adapter (phase 1 extensions)', () => {
  describe('normalizeUrl', () => {
    it('strips trailing slashes', () => {
      expect(normalizeUrl('https://x.y/')).toBe('https://x.y');
      expect(normalizeUrl('https://x.y//')).toBe('https://x.y');
      expect(normalizeUrl('https://x.y/a/')).toBe('https://x.y/a');
    });
  });

  describe('fetchDelegateProgress', () => {
    it('GETs progress with jid and since', async () => {
      const spy = mockFetchJson({ data: { events: [], count: 0 }, success: true });
      await fetchDelegateProgress(CONFIG, 'delegate:task:t1', '2026-04-15T00:00:00Z');
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/api/agent/channel/progress?');
      expect(url).toContain('jid=delegate%3Atask%3At1');
      expect(url).toContain('since=2026-04-15T00%3A00%3A00Z');
      expect((spy.mock.calls[0][1] as RequestInit).headers).toEqual({
        Authorization: 'Bearer tok-http',
      });
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(fetchDelegateProgress(CONFIG, 'x')).rejects.toThrow(/Delegate progress failed: 500/);
    });
  });

  describe('fetchDelegateWorktree', () => {
    it('GETs worktree with jid', async () => {
      const spy = mockFetchJson({
        data: { repo: 'owner/repo', branch: 'main', commit: 'abc', dirty: false },
        success: true,
      });
      const result = await fetchDelegateWorktree(CONFIG, 'delegate:task:t1');
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/api/agent/channel/worktree?');
      expect(url).toContain('jid=delegate%3Atask%3At1');
      expect(result?.branch).toBe('main');
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(fetchDelegateWorktree(CONFIG, 'x')).rejects.toThrow(/Delegate worktree failed: 500/);
    });
  });

  describe('fetchUserUsage', () => {
    it('GETs /api/usage', async () => {
      const spy = mockFetchJson({
        data: { balance: 1000, used: 50, limit: 5000 },
        success: true,
      });
      const result = await fetchUserUsage(CONFIG);
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/usage');
      expect(result?.balance).toBe(1000);
    });

    it('throws on 401', async () => {
      mockFetchJson({}, 401);
      await expect(fetchUserUsage(CONFIG)).rejects.toThrow(/User usage failed: 401/);
    });
  });

  describe('postUsageTopup', () => {
    it('POSTs amount in cents', async () => {
      const spy = mockFetchJson({
        data: { ok: true, checkoutUrl: 'https://stripe.example/checkout' },
        success: true,
      });
      const result = await postUsageTopup(CONFIG, 2500);
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/usage/topup');
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ amount: 2500 }));
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
      expect(result.checkoutUrl).toBe('https://stripe.example/checkout');
    });

    it('throws on 402 (payment required)', async () => {
      mockFetchJson({}, 402);
      await expect(postUsageTopup(CONFIG, 500)).rejects.toThrow(/Usage topup failed: 402/);
    });
  });
});
