import {
  listDelegateGroups,
  getDelegateAgentStatus,
  ensureDelegateGroup,
  getDelegateServerHealth,
  syncDelegateServer,
} from './delegate-groups';

const CONFIG = { apiUrl: 'https://delegate.test', apiToken: 'tok-grp' };

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

describe('delegate-groups', () => {
  describe('listDelegateGroups', () => {
    it('GETs /api/delegate-agent/groups', async () => {
      const spy = mockFetchJson({
        data: [{ jid: 'delegate:main', name: 'Main' }],
        success: true,
      });
      const result = await listDelegateGroups(CONFIG);
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/delegate-agent/groups');
      expect(result.groups).toHaveLength(1);
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(listDelegateGroups(CONFIG)).rejects.toThrow(/listDelegateGroups failed: 500/);
    });
  });

  describe('getDelegateAgentStatus', () => {
    it('fetches status', async () => {
      const spy = mockFetchJson({
        data: { connected: true, sessionId: 'abc', groups: ['delegate:main'] },
        success: true,
      });
      const result = await getDelegateAgentStatus(CONFIG);
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/agent/delegate-agent/status');
      expect(result.connected).toBe(true);
    });

    it('throws on 503', async () => {
      mockFetchJson({}, 503);
      await expect(getDelegateAgentStatus(CONFIG)).rejects.toThrow(/getDelegateAgentStatus failed: 503/);
    });
  });

  describe('ensureDelegateGroup', () => {
    it('POSTs jid and name plus options', async () => {
      const spy = mockFetchJson({
        data: { ok: true, jid: 'delegate:task:t1', created: true },
        success: true,
      });
      await ensureDelegateGroup(CONFIG, 'delegate:task:t1', 'My task', { agents: ['a1'] });
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(init.body).toBe(
        JSON.stringify({ jid: 'delegate:task:t1', name: 'My task', agents: ['a1'] }),
      );
    });

    it('throws on 400', async () => {
      mockFetchJson({}, 400);
      await expect(ensureDelegateGroup(CONFIG, '', '')).rejects.toThrow(
        /ensureDelegateGroup failed: 400/,
      );
    });
  });

  describe('getDelegateServerHealth', () => {
    it('fetches health', async () => {
      const spy = mockFetchJson({
        data: { ok: true, uptimeSec: 1000, timestamp: 't' },
        success: true,
      });
      const result = await getDelegateServerHealth(CONFIG);
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/agents/server/health');
      expect(result.ok).toBe(true);
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(getDelegateServerHealth(CONFIG)).rejects.toThrow(/getDelegateServerHealth failed: 500/);
    });
  });

  describe('syncDelegateServer', () => {
    it('POSTs empty body', async () => {
      const spy = mockFetchJson({ data: { ok: true, message: 'done' }, success: true });
      const result = await syncDelegateServer(CONFIG);
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(init.body).toBe('{}');
      expect(result.message).toBe('done');
    });

    it('throws on 503', async () => {
      mockFetchJson({}, 503);
      await expect(syncDelegateServer(CONFIG)).rejects.toThrow(/syncDelegateServer failed: 503/);
    });
  });
});
