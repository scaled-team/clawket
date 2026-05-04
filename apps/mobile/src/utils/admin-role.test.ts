import { hasMinRole, isAdminRole, roleLevel } from './admin-role';

describe('admin-role', () => {
  describe('hasMinRole (3x3 matrix)', () => {
    it('SUPER_ADMIN satisfies SUPER_ADMIN', () => {
      expect(hasMinRole('SUPER_ADMIN', 'SUPER_ADMIN')).toBe(true);
    });
    it('SUPER_ADMIN satisfies CS_ADMIN', () => {
      expect(hasMinRole('SUPER_ADMIN', 'CS_ADMIN')).toBe(true);
    });
    it('SUPER_ADMIN satisfies CS_AGENT', () => {
      expect(hasMinRole('SUPER_ADMIN', 'CS_AGENT')).toBe(true);
    });
    it('CS_ADMIN does not satisfy SUPER_ADMIN', () => {
      expect(hasMinRole('CS_ADMIN', 'SUPER_ADMIN')).toBe(false);
    });
    it('CS_ADMIN satisfies CS_ADMIN', () => {
      expect(hasMinRole('CS_ADMIN', 'CS_ADMIN')).toBe(true);
    });
    it('CS_ADMIN satisfies CS_AGENT', () => {
      expect(hasMinRole('CS_ADMIN', 'CS_AGENT')).toBe(true);
    });
    it('CS_AGENT does not satisfy SUPER_ADMIN', () => {
      expect(hasMinRole('CS_AGENT', 'SUPER_ADMIN')).toBe(false);
    });
    it('CS_AGENT does not satisfy CS_ADMIN', () => {
      expect(hasMinRole('CS_AGENT', 'CS_ADMIN')).toBe(false);
    });
    it('CS_AGENT satisfies CS_AGENT', () => {
      expect(hasMinRole('CS_AGENT', 'CS_AGENT')).toBe(true);
    });

    it('null / undefined never satisfy', () => {
      expect(hasMinRole(null, 'CS_AGENT')).toBe(false);
      expect(hasMinRole(undefined, 'CS_AGENT')).toBe(false);
      expect(hasMinRole('', 'CS_AGENT')).toBe(false);
    });

    it('unknown strings are treated as no-role', () => {
      expect(hasMinRole('NOT_A_ROLE', 'CS_AGENT')).toBe(false);
    });
  });

  describe('roleLevel', () => {
    it('returns 0 for nullish values', () => {
      expect(roleLevel(null)).toBe(0);
      expect(roleLevel(undefined)).toBe(0);
    });
    it('maps roles to 1..3', () => {
      expect(roleLevel('CS_AGENT')).toBe(1);
      expect(roleLevel('CS_ADMIN')).toBe(2);
      expect(roleLevel('SUPER_ADMIN')).toBe(3);
    });
  });

  describe('isAdminRole', () => {
    it('accepts the three known roles', () => {
      expect(isAdminRole('SUPER_ADMIN')).toBe(true);
      expect(isAdminRole('CS_ADMIN')).toBe(true);
      expect(isAdminRole('CS_AGENT')).toBe(true);
    });
    it('rejects everything else', () => {
      expect(isAdminRole('admin')).toBe(false);
      expect(isAdminRole(null)).toBe(false);
      expect(isAdminRole(undefined)).toBe(false);
      expect(isAdminRole(42)).toBe(false);
    });
  });
});
