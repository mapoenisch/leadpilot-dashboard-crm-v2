import { describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';
import { migrateV1ToV2 } from '../model/dashboardMigrationV1V2';
import { validateDashboardConfigV2 } from '../model/dashboardConfigV2';
import {
  findLayoutIntegrityError,
  prepareConfigForStorage,
} from '../services/dashboardLayoutIntegrity';
import {
  DASHBOARD_TEMPLATES_V2,
  type DashboardTemplateContext,
  getDashboardTemplateV2ById,
} from '../model/dashboardTemplatesV2';

describe('Auftrag 158: V2-Vorlagen (dashboardTemplatesV2)', () => {
  const context: DashboardTemplateContext = {
    id: '00000000-0000-0000-0000-000000000001',
    title: 'Template Test',
    ownerUserId: '91580000-0000-0000-0000-000000000001',
    organizationId: 'a1580000-0000-0000-0000-000000000001',
    scope: 'personal',
    timestamp: '2026-11-14T12:00:00.000Z',
  };

  it('enthält genau vier Vorlagen mit gültigen Metadaten', () => {
    expect(DASHBOARD_TEMPLATES_V2).toHaveLength(4);
    expect(DASHBOARD_TEMPLATES_V2.map((t) => t.id)).toEqual([
      'executive',
      'sales',
      'finance',
      'blank',
    ]);
  });

  it('Executive Summary ist bytegleich zur heutigen Erstmigration aus DEFAULT_DASHBOARD_CONFIG', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-18T10:00:00.000Z'));
    try {
      const rawContext = {
        id: '00000000-0000-0000-0000-000000000001',
        title: 'Executive Summary',
        ownerUserId: '91580000-0000-0000-0000-000000000001',
        organizationId: 'a1580000-0000-0000-0000-000000000001',
        scope: 'personal' as const,
      };
      const template = getDashboardTemplateV2ById('executive')!;
      const fromTemplate = template.build(rawContext);
      const fromDirectMigration = migrateV1ToV2(DEFAULT_DASHBOARD_CONFIG, rawContext);

      // Bytegleich (gleiche JSON-Serialisierung)
      expect(JSON.stringify(fromTemplate)).toBe(JSON.stringify(fromDirectMigration));
      expect(fromTemplate.sections).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(DASHBOARD_TEMPLATES_V2)(
    'Vorlage $id ist valide, kollisionsfrei und prepareConfigForStorage ist idempotent',
    (template) => {
      const config = template.build(context);

      // 1. Schema-Validierung
      const valid = validateDashboardConfigV2(config);
      expect(valid.ok).toBe(true);

      // 2. Keine Layout-Integritätsfehler (Überlappung, außerhalb Grid)
      expect(findLayoutIntegrityError(config)).toBeNull();

      // 3. prepareConfigForStorage ist erfolgreich
      const prepared = prepareConfigForStorage(config);
      expect(prepared.ok).toBe(true);

      // 4. Idempotenz: Zweiter Durchlauf liefert identische Kacheln und Sektionen
      if (prepared.ok) {
        const prep2 = prepareConfigForStorage(prepared.config);
        expect(prep2.ok).toBe(true);
        if (prep2.ok) {
          expect(prep2.config.tiles).toEqual(prepared.config.tiles);
          expect(prep2.config.sections).toEqual(prepared.config.sections);
        }
      }
    },
  );

  it('build ist deterministisch für identischen Kontext', () => {
    for (const template of DASHBOARD_TEMPLATES_V2) {
      const run1 = template.build(context);
      const run2 = template.build(context);
      expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
    }
  });

  it('erzeugt und aktualisiert die Server-Fixtures für pgTAP', () => {
    const fixtureDir = resolve(
      process.cwd(),
      'supabase/tests/fixtures/dashboard_templates',
    );
    if (!existsSync(fixtureDir)) {
      mkdirSync(fixtureDir, { recursive: true });
    }

    for (const template of DASHBOARD_TEMPLATES_V2) {
      const config = template.build(context);
      const filePath = resolve(fixtureDir, `${template.id}.json`);
      writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
      expect(existsSync(filePath)).toBe(true);
    }
  });
});
