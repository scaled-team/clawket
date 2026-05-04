import {
  listDelegateAgentServers,
  getDelegateAgentServerHealth,
  maskApiToken,
} from './delegate-agent-servers';

const CONFIG = { apiUrl: 'https://delegate.test', apiToken: 'tok-srv' };

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

describe('delegate-agent-servers', () => {
  describe('listDelegateAgentServers', () => {
    it('hits /api/user/delegate-agent-servers when no workspaceId', async () => {
      const spy = mockFetchJson({
        data: {
          servers: [
            {
              id: 's1',
              name: 'Prod',
              url: 'https://agent.delegate.ws',
              apiToken: 'tok-LONG-SECRET-123456',
              enabled: true,
              isDefault: true,
              workspaceId: 'ws-1',
            },
          ],
        },
        success: true,
      });
      const result = await listDelegateAgentServers(CONFIG);
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/user/delegate-agent-servers');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Prod');
      expect(result[0].health).toBe('unknown');
      expect(result[0].apiToken).toBe('tok-LONG-SECRET-123456');
    });

    it('hits /api/workspaces/[id]/delegate-agent-servers when workspaceId provided', async () => {
      const spy = mockFetchJson({ data: { servers: [] }, success: true });
      await listDelegateAgentServers(CONFIG, { workspaceId: 'ws-42' });
      expect(spy.mock.calls[0][0]).toBe(
        'https://delegate.test/api/workspaces/ws-42/delegate-agent-servers',
      );
    });

    it('throws on 401', async () => {
      mockFetchJson({}, 401);
      await expect(listDelegateAgentServers(CONFIG)).rejects.toThrow(
        /listDelegateAgentServers failed: 401/,
      );
    });
  });

  describe('getDelegateAgentServerHealth', () => {
    it('returns ok=true when backend reports healthy', async () => {
      const spy = mockFetchJson({
        data: {
          healthy: true,
          latencyMs: 142,
          lastChecked: '2026-05-02T12:00:00Z',
          gatewayVersion: 'v5',
          agentCount: 4,
        },
        success: true,
      });
      const result = await getDelegateAgentServerHealth(CONFIG, 's1');
      expect(spy.mock.calls[0][0]).toBe(
        'https://delegate.test/api/user/delegate-agent-servers/s1/health',
      );
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.latencyMs).toBe(142);
      expect(result.lastSeen).toBe('2026-05-02T12:00:00Z');
      expect(result.gatewayVersion).toBe('v5');
      expect(result.agentCount).toBe(4);
    });

    it('returns ok=false when backend reports unhealthy', async () => {
      mockFetchJson({
        data: { healthy: false, error: 'Connection timed out (10s)' },
        success: true,
      });
      const result = await getDelegateAgentServerHealth(CONFIG, 's1');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Connection timed out (10s)');
    });

    it('returns ok=false on non-2xx HTTP without throwing', async () => {
      mockFetchJson({}, 500);
      const result = await getDelegateAgentServerHealth(CONFIG, 's1');
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toBe('HTTP 500');
    });

    it('returns ok=false on network error without throwing', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('TypeError: Network request failed'));
      const result = await getDelegateAgentServerHealth(CONFIG, 's1');
      expect(result.ok).toBe(false);
      expect(result.status).toBe(null);
      expect(result.error).toMatch(/Network request failed/);
    });
  });

  describe('maskApiToken', () => {
    it('masks all but last 6 characters', () => {
      expect(maskApiToken('tok-LONG-SECRET-123456')).toBe('••••123456');
    });
    it('returns empty string for null/undefined', () => {
      expect(maskApiToken(null)).toBe('');
      expect(maskApiToken(undefined)).toBe('');
    });
  });
});
