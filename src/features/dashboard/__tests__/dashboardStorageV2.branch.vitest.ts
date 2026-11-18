import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDashboardV2,
  loadPersonalDashboardV2,
  resetInMemoryDashboardV2Storage,
  saveDashboardV2,
} from '../services/dashboardStorageV2';
import {
  deletePersonalDashboardV2,
  duplicatePersonalDashboardV2,
  listPersonalDashboardsV2,
  loadAndActivateDashboardV2,
} from '../services/dashboardSelectionV2';
import type { StoredDashboardV2Row } from '../services/dashboardStorageV2Types';
import { inMemoryStore } from '../services/dashboardInMemoryStoreV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';

describe('dashboardStorageV2 and dashboardSelectionV2 branches', () => {
  beforeEach(() => {
    resetInMemoryDashboardV2Storage();
  });

  const makeConfig = (
    id = 'dash_branch_1',
    title = 'Branch Test Dashboard',
  ): DashboardConfigV2 => ({
    version: 2,
    id,
    title,
    scope: 'personal',
    ownerUserId: 'usr_branch',
    organizationId: 'org_branch',
    globalTimeframe: 'letzte_30_tage',
    tiles: [
      {
        id: 'tile_b1',
        catalogId: 'baseline.arr',
        title: 'ARR',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 0, y: 0, w: 3, h: 3 },
        },
      },
    ],
    metadata: {
      user_edited: false,
    },
  });

  describe('createDashboardV2 edge cases', () => {
    it('verhindert Team-Scope im In-Memory-Modus', async () => {
      const config = makeConfig();
      const res = await createDashboardV2({
        title: 'Team Dash',
        config: { ...config, scope: 'team', teamId: 'team_1' },
        scope: 'team',
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('nicht_verfuegbar');
      }
    });

    it('validiert Titellänge im In-Memory-Modus (leer oder > 80 Zeichen)', async () => {
      const config = makeConfig();
      const resEmpty = await createDashboardV2({
        title: '   ',
        config,
      });
      expect(resEmpty.ok).toBe(false);
      if (!resEmpty.ok) {
        expect(resEmpty.error.kind).toBe('ungueltig');
      }

      const resTooLong = await createDashboardV2({
        title: 'X'.repeat(81),
        config: { ...config, title: 'X'.repeat(81) },
      });
      expect(resTooLong.ok).toBe(false);
      if (!resTooLong.ok) {
        expect(resTooLong.error.kind).toBe('ungueltig');
      }
    });

    it('erzeugt automatisch eine Mock-ID wenn die ID bereits existiert', async () => {
      const c1 = makeConfig('dash_existing_id', 'Existing');
      await createDashboardV2({ title: 'Existing', config: c1 });

      const c2 = makeConfig('dash_existing_id', 'Duplicate ID Attempt');
      const res = await createDashboardV2({
        title: 'Duplicate ID Attempt',
        config: c2,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.dashboardId).toMatch(/^dash_mock_/);
        expect(res.value.dashboardId).not.toBe('dash_existing_id');
      }
    });

    it('blockiert Erstellung bei Erreichen der Obergrenze von 20 Dashboards', async () => {
      for (let i = 0; i < 20; i++) {
        const conf = makeConfig(`dash_limit_${i}`, `Dash ${i}`);
        await createDashboardV2({ title: `Dash ${i}`, config: conf });
      }

      const overflow = makeConfig('dash_overflow', 'Overflow Dash');
      const res = await createDashboardV2({ title: 'Overflow Dash', config: overflow });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('obergrenze_erreicht');
      }
    });
  });

  describe('saveDashboardV2 edge cases', () => {
    it('erstellt Dashboard neu bei expectedRevision 0 falls es noch nicht existiert', async () => {
      const config = makeConfig('dash_rev0_new', 'Brand New');
      const res = await saveDashboardV2({
        dashboardId: 'dash_rev0_new',
        expectedRevision: 0,
        title: 'Brand New',
        config,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.revision).toBe(1);
      }
    });

    it('gibt nicht_gefunden zurück wenn Dashboard nicht existiert und expectedRevision > 0', async () => {
      const config = makeConfig('dash_nonexistent', 'Ghost');
      const res = await saveDashboardV2({
        dashboardId: 'dash_nonexistent',
        expectedRevision: 1,
        title: 'Ghost',
        config,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('nicht_gefunden');
      }
    });
  });

  describe('loadPersonalDashboardV2 targeted', () => {
    it('gibt null zurück wenn gezielte dashboardId nicht im Store existiert', async () => {
      const res = await loadPersonalDashboardV2('non_existent_id');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toBeNull();
      }
    });
  });

  describe('dashboardSelectionV2 methods', () => {
    it('listet persönliche Dashboards sortiert nach updatedAt absteigend', async () => {
      const c1 = makeConfig('dash_list_1', 'Dash 1');
      const c2 = makeConfig('dash_list_2', 'Dash 2');
      await createDashboardV2({ title: 'Dash 1', config: c1 });
      await createDashboardV2({ title: 'Dash 2', config: c2 });

      const listRes = await listPersonalDashboardsV2();
      expect(listRes.ok).toBe(true);
      if (listRes.ok) {
        expect(listRes.value.length).toBe(2);
        expect(listRes.value[0]?.id).toBe('dash_list_2');
        expect(listRes.value[1]?.id).toBe('dash_list_1');
      }
    });

    it('löscht ein persönliches Dashboard und liefert nextDashboardId', async () => {
      const c1 = makeConfig('dash_del_1', 'Dash 1');
      const c2 = makeConfig('dash_del_2', 'Dash 2');
      await createDashboardV2({ title: 'Dash 1', config: c1 });
      await createDashboardV2({ title: 'Dash 2', config: c2 });

      // Fehler: nicht existierend
      const notFoundRes = await deletePersonalDashboardV2({ dashboardId: 'ghost' });
      expect(notFoundRes.ok).toBe(false);
      if (!notFoundRes.ok) expect(notFoundRes.error.kind).toBe('nicht_gefunden');

      // Fehler: Revisionskonflikt
      const conflictRes = await deletePersonalDashboardV2({
        dashboardId: 'dash_del_1',
        expectedRevision: 99,
      });
      expect(conflictRes.ok).toBe(false);
      if (!conflictRes.ok) expect(conflictRes.error.kind).toBe('konflikt');

      // Erfolgreich löschen
      const delRes = await deletePersonalDashboardV2({
        dashboardId: 'dash_del_2',
        expectedRevision: 1,
      });
      expect(delRes.ok).toBe(true);
      if (delRes.ok) {
        expect(delRes.value.deletedId).toBe('dash_del_2');
        expect(delRes.value.nextDashboardId).toBe('dash_del_1');
      }

      // Fehler: letztes verbleibendes Dashboard darf nicht gelöscht werden
      const lastRes = await deletePersonalDashboardV2({ dashboardId: 'dash_del_1' });
      expect(lastRes.ok).toBe(false);
      if (!lastRes.ok) expect(lastRes.error.kind).toBe('letztes_dashboard');
    });

    it('dupliziert ein persönliches Dashboard mit Validierungen', async () => {
      const c1 = makeConfig('dash_dup_source', 'Source');
      await createDashboardV2({ title: 'Source', config: c1 });

      // Ungültiger Titel
      const invalidRes = await duplicatePersonalDashboardV2({
        dashboardId: 'dash_dup_source',
        title: '',
      });
      expect(invalidRes.ok).toBe(false);
      if (!invalidRes.ok) expect(invalidRes.error.kind).toBe('ungueltig');

      // Quelle nicht gefunden
      const ghostRes = await duplicatePersonalDashboardV2({
        dashboardId: 'ghost',
        title: 'New Copy',
      });
      expect(ghostRes.ok).toBe(false);
      if (!ghostRes.ok) expect(ghostRes.error.kind).toBe('nicht_gefunden');

      // Erfolgreiches Duplizieren
      const dupRes = await duplicatePersonalDashboardV2({
        dashboardId: 'dash_dup_source',
        title: 'Source Copy',
      });
      expect(dupRes.ok).toBe(true);
      if (dupRes.ok) {
        expect(dupRes.value.revision).toBe(1);
        expect(dupRes.value.dashboardId).toMatch(/^dash_v2_/);
      }

      // Obergrenze 20 prüfen
      while (inMemoryStore.size < 20) {
        const id = `dash_fill_${inMemoryStore.size}`;
        await createDashboardV2({ title: id, config: makeConfig(id, id) });
      }
      const limitRes = await duplicatePersonalDashboardV2({
        dashboardId: 'dash_dup_source',
        title: 'Over 20',
      });
      expect(limitRes.ok).toBe(false);
      if (!limitRes.ok) expect(limitRes.error.kind).toBe('obergrenze_erreicht');
    });

    it('loadAndActivateDashboardV2 aktiviert und lädt das Dashboard oder fängt Fehler ab', async () => {
      const c1 = makeConfig('dash_act_1', 'Active Dash');
      await createDashboardV2({ title: 'Active Dash', config: c1 });

      let activated: StoredDashboardV2Row | null = null;
      const successRes = await loadAndActivateDashboardV2(
        'dash_act_1',
        'org_branch',
        'usr_branch',
        (d) => {
          activated = d;
        },
      );
      expect(successRes.ok).toBe(true);
      expect((activated as StoredDashboardV2Row | null)?.id).toBe('dash_act_1');

      // Wenn Store leer ist, liefert getInMemoryDashboard null
      resetInMemoryDashboardV2Storage();
      const failRes = await loadAndActivateDashboardV2(
        'ghost',
        'org_branch',
        'usr_branch',
        () => {},
      );
      expect(failRes.ok).toBe(false);
      if (!failRes.ok) expect(failRes.error.kind).toBe('nicht_gefunden');
    });
  });
});
