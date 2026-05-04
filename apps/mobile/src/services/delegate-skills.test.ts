import { listSkills, getSkill, importSkill, seedSkills } from './delegate-skills';

const CONFIG = { apiUrl: 'https://delegate.test/', apiToken: 'tok-skill' };

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

describe('delegate-skills', () => {
  describe('listSkills', () => {
    it('GETs /api/skills and unwraps envelope', async () => {
      const spy = mockFetchJson({ data: [{ id: 's1', name: 'gstack' }], success: true });
      const result = await listSkills(CONFIG);
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/skills');
      expect(result.skills).toHaveLength(1);
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(listSkills(CONFIG)).rejects.toThrow(/listSkills failed: 500/);
    });
  });

  describe('getSkill', () => {
    it('fetches skill detail', async () => {
      const spy = mockFetchJson({ data: { id: 's1', name: 'gstack', content: '# hi' }, success: true });
      const result = await getSkill(CONFIG, 's1');
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/skills/s1');
      expect(result.content).toBe('# hi');
    });

    it('throws on 404', async () => {
      mockFetchJson({}, 404);
      await expect(getSkill(CONFIG, 'missing')).rejects.toThrow(/getSkill failed: 404/);
    });
  });

  describe('importSkill', () => {
    it('POSTs skill input', async () => {
      const spy = mockFetchJson({ data: { id: 's9', name: 'new', content: 'x' }, success: true });
      await importSkill(CONFIG, { name: 'new', content: 'x' });
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ name: 'new', content: 'x' }));
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });

    it('throws on 400', async () => {
      mockFetchJson({}, 400);
      await expect(importSkill(CONFIG, { name: '', content: '' })).rejects.toThrow(/importSkill failed: 400/);
    });
  });

  describe('seedSkills', () => {
    it('POSTs to seed endpoint', async () => {
      const spy = mockFetchJson({ data: { ok: true, seeded: 36 }, success: true });
      const result = await seedSkills(CONFIG);
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/skills/seed');
      expect(result.seeded).toBe(36);
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(seedSkills(CONFIG)).rejects.toThrow(/seedSkills failed: 500/);
    });
  });
});
