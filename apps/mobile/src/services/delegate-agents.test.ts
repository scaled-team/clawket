import {
  listDelegateAgents,
  getDelegateAgent,
  updateDelegateAgent,
  getDelegateAgentFeed,
  getDelegateAgentMessages,
  syncDelegateProfiles,
  listAgentTemplates,
  createAgentFromTemplate,
} from './delegate-agents';

const CONFIG = { apiUrl: 'https://delegate.test/', apiToken: 'tok-123' };

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

describe('delegate-agents', () => {
  describe('listDelegateAgents', () => {
    it('GETs /api/agents with bearer token and unwraps data envelope', async () => {
      const spy = mockFetchJson({ data: [{ id: 'a1', name: 'Alpha', isActive: true }], success: true });
      const result = await listDelegateAgents(CONFIG);
      expect(spy).toHaveBeenCalledWith(
        'https://delegate.test/api/agents',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer tok-123' }),
        }),
      );
      expect(result).toEqual({ agents: [{ id: 'a1', name: 'Alpha', isActive: true }] });
    });

    it('throws on non-2xx response', async () => {
      mockFetchJson({}, 500);
      await expect(listDelegateAgents(CONFIG)).rejects.toThrow(/listDelegateAgents failed: 500/);
    });
  });

  describe('getDelegateAgent', () => {
    it('fetches a single agent by id with URL-encoded id', async () => {
      const spy = mockFetchJson({ data: { id: 'a b', name: 'Beta', isActive: false }, success: true });
      const agent = await getDelegateAgent(CONFIG, 'a b');
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/agents/a%20b');
      expect(agent.name).toBe('Beta');
    });

    it('throws on 404', async () => {
      mockFetchJson({ error: 'not found' }, 404);
      await expect(getDelegateAgent(CONFIG, 'missing')).rejects.toThrow(/getDelegateAgent failed: 404/);
    });
  });

  describe('updateDelegateAgent', () => {
    it('PATCHes with JSON body and correct headers', async () => {
      const spy = mockFetchJson({ data: { id: 'a1', name: 'Alpha', isActive: false }, success: true });
      await updateDelegateAgent(CONFIG, 'a1', { isActive: false });
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('PATCH');
      expect(init.body).toBe(JSON.stringify({ isActive: false }));
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-123');
    });

    it('throws on 403', async () => {
      mockFetchJson({ error: 'forbidden' }, 403);
      await expect(updateDelegateAgent(CONFIG, 'a1', { isActive: true })).rejects.toThrow(
        /updateDelegateAgent failed: 403/,
      );
    });
  });

  describe('getDelegateAgentFeed', () => {
    it('appends limit and since to query string', async () => {
      const spy = mockFetchJson({ data: { events: [] }, success: true });
      await getDelegateAgentFeed(CONFIG, 'a1', { limit: 25, since: '2026-04-01T00:00:00Z' });
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/api/agents/a1/feed?');
      expect(url).toContain('limit=25');
      expect(url).toContain('since=2026-04-01T00%3A00%3A00Z');
    });

    it('returns empty events when payload is null', async () => {
      mockFetchJson({ data: [], success: true });
      const result = await getDelegateAgentFeed(CONFIG, 'a1');
      expect(result).toEqual({ events: [] });
    });
  });

  describe('getDelegateAgentMessages', () => {
    it('GETs messages endpoint', async () => {
      const spy = mockFetchJson({
        data: { messages: [{ id: 'm1', text: 'hi', role: 'user', timestamp: 't', isAI: false }] },
        success: true,
      });
      const result = await getDelegateAgentMessages(CONFIG, 'a1');
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/agents/a1/messages');
      expect(result.messages).toHaveLength(1);
    });

    it('throws on 401', async () => {
      mockFetchJson({}, 401);
      await expect(getDelegateAgentMessages(CONFIG, 'a1')).rejects.toThrow(
        /getDelegateAgentMessages failed: 401/,
      );
    });
  });

  describe('syncDelegateProfiles', () => {
    it('POSTs empty body and returns ok', async () => {
      const spy = mockFetchJson({ data: { ok: true, synced: 3 }, success: true });
      const result = await syncDelegateProfiles(CONFIG);
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(init.body).toBe('{}');
      expect(result).toEqual({ ok: true, synced: 3 });
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(syncDelegateProfiles(CONFIG)).rejects.toThrow(/syncDelegateProfiles failed: 500/);
    });
  });

  describe('listAgentTemplates', () => {
    it('GETs /api/agents/templates and unwraps templates array', async () => {
      const spy = mockFetchJson({
        templates: [
          { id: 't1', name: 'CEO', role: 'ceo', category: 'executive' },
          { id: 't2', name: 'CTO', role: 'cto', category: 'executive' },
        ],
      });
      const result = await listAgentTemplates(CONFIG);
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/agents/templates');
      expect(result.templates).toHaveLength(2);
      expect(result.templates[0].id).toBe('t1');
    });

    it('forwards category filter as query string', async () => {
      const spy = mockFetchJson({ templates: [] });
      await listAgentTemplates(CONFIG, { category: 'executive' });
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/agents/templates?category=executive');
    });

    it('throws on 401', async () => {
      mockFetchJson({}, 401);
      await expect(listAgentTemplates(CONFIG)).rejects.toThrow(/listAgentTemplates failed: 401/);
    });
  });

  describe('createAgentFromTemplate', () => {
    it('POSTs templateId + overrides.name and normalizes agentProfile to AgentProfileRow', async () => {
      const spy = mockFetchJson({
        id: 'u1',
        name: 'MyAgent',
        agentProfile: {
          id: 'p1',
          role: 'coder',
          isActive: true,
          color: '#f00',
          avatar: null,
        },
      }, 201);
      const result = await createAgentFromTemplate(CONFIG, 't1', 'MyAgent');
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/agents/from-template');
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body as string);
      expect(body.templateId).toBe('t1');
      expect(body.overrides.name).toBe('MyAgent');
      expect(result.agent.id).toBe('p1');
      expect(result.agent.name).toBe('MyAgent');
      expect(result.agent.isActive).toBe(true);
    });

    it('forwards workspaceId and extra overrides', async () => {
      const spy = mockFetchJson({ agentProfile: { id: 'p2', isActive: true } }, 201);
      await createAgentFromTemplate(CONFIG, 't1', 'Name', {
        workspaceId: 'ws1',
        overrides: { color: '#0f0' },
      });
      const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
      expect(body.workspaceId).toBe('ws1');
      expect(body.overrides.color).toBe('#0f0');
      expect(body.overrides.name).toBe('Name');
    });

    it('throws on non-2xx response', async () => {
      mockFetchJson({ error: 'template not found' }, 404);
      await expect(createAgentFromTemplate(CONFIG, 'missing', 'Agent')).rejects.toThrow(
        /createAgentFromTemplate failed: 404/,
      );
    });
  });
});
