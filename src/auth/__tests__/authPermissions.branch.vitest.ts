// Branch-Tests: Rollenmatrix, Rollen-Guard und LocalAuth-Stub (rein, kein IO).
import { describe, it, expect } from 'vitest';
import { permissionsFor, can } from '../permissions';
import { isOrganizationRole } from '../../types/organization';
import { defaultAuthAdapter } from '../localAuthAdapter';

describe('authPermissions.branch', () => {
  it('admin hat alle sechs Berechtigungen', () => {
    expect([...permissionsFor('admin')].sort()).toEqual(
      [
        'crm:read',
        'crm:write',
        'members:manage',
        'settings:manage',
        'simulation:run',
        'sources:manage',
      ].sort(),
    );
  });

  it('manager darf lesen und simulieren, sonst nichts', () => {
    expect(permissionsFor('manager')).toEqual(['crm:read', 'simulation:run']);
    expect(can('crm:read', 'manager')).toBe(true);
    expect(can('simulation:run', 'manager')).toBe(true);
    expect(can('crm:write', 'manager')).toBe(false);
    expect(can('members:manage', 'manager')).toBe(false);
  });

  it('viewer liest ausschließlich', () => {
    expect(permissionsFor('viewer')).toEqual(['crm:read']);
    expect(can('crm:read', 'viewer')).toBe(true);
    expect(can('simulation:run', 'viewer')).toBe(false);
    expect(can('settings:manage', 'viewer')).toBe(false);
  });

  it('can spiegelt die Matrix für jede Rolle', () => {
    expect(can('members:manage', 'admin')).toBe(true);
    expect(can('sources:manage', 'admin')).toBe(true);
    expect(can('crm:write', 'admin')).toBe(true);
    expect(can('crm:write', 'viewer')).toBe(false);
  });

  it('isOrganizationRole akzeptiert nur admin/manager/viewer', () => {
    expect(isOrganizationRole('admin')).toBe(true);
    expect(isOrganizationRole('manager')).toBe(true);
    expect(isOrganizationRole('viewer')).toBe(true);
    for (const bad of ['', 'owner', 'ADMIN', null, undefined, 0, {}, []]) {
      expect(isOrganizationRole(bad)).toBe(false);
    }
  });

  it('LocalAuth-Stub wirft ehrlich statt Demo-Sitzung', async () => {
    await expect(defaultAuthAdapter.login('a@b.de', 'pw')).rejects.toThrow(/G45 entfernt/);
    await expect(defaultAuthAdapter.logout()).rejects.toThrow(/G45 entfernt/);
    expect(() => defaultAuthAdapter.getSession()).toThrow(/G45 entfernt/);
  });
});
