import { listDelegateWorkspaces } from './delegate-workspaces';

const CONFIG = { apiUrl: 'https://delegate.test/', apiToken: 'tok-ws' };

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

describe('delegate-workspaces', () => {
  describe('listDelegateWorkspaces', () => {
    it('unwraps apiList envelope and maps to summaries with owner-first sort', async () => {
      const spy = mockFetchJson({
        data: [
          {
            id: 'ws-2',
            name: 'Beta',
            slug: 'beta',
            icon: '🅱️',
            color: 'red',
            userId: 'u-1',
            members: [{ id: 'm1', userId: 'u-1', role: 'owner' }],
            _count: { projects: 2, members: 5 },
          },
          {
            id: 'ws-3',
            name: 'Acme',
            slug: 'acme',
            icon: null,
            color: null,
            userId: 'u-other',
            members: [
              { id: 'm2', userId: 'u-other', role: 'owner' },
              { id: 'm3', userId: 'u-1', role: 'member' },
            ],
            _count: { projects: 0, members: 2 },
          },
        ],
        success: true,
      });
      const result = await listDelegateWorkspaces(CONFIG, { currentUserId: 'u-1' });
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/workspaces');
      expect((spy.mock.calls[0][1] as RequestInit).headers).toEqual(
        expect.objectContaining({ Authorization: 'Bearer tok-ws' }),
      );
      expect(result).toHaveLength(2);
      // Owner-workspace (Beta) should sort before member-only Acme.
      expect(result[0].id).toBe('ws-2');
      expect(result[0].isOwner).toBe(true);
      expect(result[0].role).toBe('owner');
      expect(result[0].memberCount).toBe(5);
      expect(result[0].projectCount).toBe(2);
      expect(result[1].id).toBe('ws-3');
      expect(result[1].isOwner).toBe(false);
      expect(result[1].role).toBe('member');
    });

    it('returns an empty list when the envelope has no data', async () => {
      mockFetchJson({ data: [], success: true });
      const result = await listDelegateWorkspaces(CONFIG);
      expect(result).toEqual([]);
    });

    it('throws on 401 (unauthorized)', async () => {
      mockFetchJson({ error: 'Unauthorized' }, 401);
      await expect(listDelegateWorkspaces(CONFIG)).rejects.toThrow(
        /listDelegateWorkspaces failed: 401/,
      );
    });
  });
});
