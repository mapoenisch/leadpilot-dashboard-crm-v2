/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchLeadQualification,
  fetchQualifiedContactIds,
  saveLeadQualification,
} from '../leadQualificationService';

const dbMock = vi.hoisted(() => ({
  configured: true,
  from: vi.fn(),
}));

vi.mock('@/services/db/supabaseClient', () => ({
  get isSupabaseConfigured() {
    return dbMock.configured;
  },
  get supabase() {
    return dbMock.configured ? { from: dbMock.from } : null;
  },
}));

interface BuilderResult {
  data?: unknown;
  error?: { message?: string } | null;
}

/**
 * Minimaler Thenable-Builder für die PostgREST-Kette
 * select().eq()…maybeSingle() / select().not() / upsert().
 */
function makeBuilder(
  readResult: BuilderResult,
  upsertError: { message?: string } | null = null,
  rangeResults?: BuilderResult[],
) {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.not = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.range = vi.fn(() => {
    const next = rangeResults?.length ? rangeResults.shift()! : readResult;
    return Promise.resolve(next);
  });
  builder.maybeSingle = vi.fn(() => Promise.resolve(readResult));
  builder.upsert = vi.fn(() => Promise.resolve({ error: upsertError }));
  builder.then = (resolve: (v: BuilderResult) => unknown) =>
    Promise.resolve(readResult).then(resolve);
  return builder;
}

const INPUT = {
  organizationId: 'org-1',
  contactId: 'contact-1',
  budget: true,
  authority: false,
  need: true,
  timeline: false,
  notes: 'Notiz',
};

describe('leadQualificationService', () => {
  beforeEach(() => {
    dbMock.configured = true;
    dbMock.from.mockReset();
  });

  describe('fetchLeadQualification', () => {
    it('liefert null ohne Datenbank oder ohne Kontakt-ID', async () => {
      dbMock.configured = false;
      expect(await fetchLeadQualification('c1')).toBeNull();
      dbMock.configured = true;
      expect(await fetchLeadQualification('')).toBeNull();
      expect(dbMock.from).not.toHaveBeenCalled();
    });

    it('mappt die Datenbankzeile auf LeadQualification', async () => {
      dbMock.from.mockReturnValue(
        makeBuilder({
          data: {
            contact_id: 'c1',
            budget: true,
            authority: true,
            need: false,
            timeline: true,
            notes: 'abc',
            qualified_at: '2026-11-09T10:00:00Z',
            updated_at: '2026-11-09T11:00:00Z',
          },
          error: null,
        }),
      );

      const result = await fetchLeadQualification('c1');
      expect(result).toEqual({
        contactId: 'c1',
        budget: true,
        authority: true,
        need: false,
        timeline: true,
        notes: 'abc',
        qualifiedAt: '2026-11-09T10:00:00Z',
        updatedAt: '2026-11-09T11:00:00Z',
      });
    });

    it('liefert null, wenn keine Zeile existiert', async () => {
      dbMock.from.mockReturnValue(makeBuilder({ data: null, error: null }));
      expect(await fetchLeadQualification('c9')).toBeNull();
    });
  });

  describe('fetchQualifiedContactIds', () => {
    it('liefert die IDs qualifizierter Kontakte', async () => {
      const builder = makeBuilder({
        data: [{ contact_id: 'c1' }, { contact_id: 'c2' }, { contact_id: 7 }],
        error: null,
      });
      dbMock.from.mockReturnValue(builder);

      await expect(fetchQualifiedContactIds()).resolves.toEqual(['c1', 'c2']);
      expect(builder.not).toHaveBeenCalledWith('qualified_at', 'is', null);
    });

    it('liefert leer ohne Datenbank', async () => {
      dbMock.configured = false;
      await expect(fetchQualifiedContactIds()).resolves.toEqual([]);
    });

    it('lädt bei vollem Blatt (>1000 Zeilen) die nächste Seite nach', async () => {
      const fullPage = Array.from({ length: 1000 }, (_, i) => ({ contact_id: `c${i}` }));
      const builder = makeBuilder({ data: [{ contact_id: 'c999' }], error: null }, null, [
        { data: fullPage, error: null },
        { data: [{ contact_id: 'c1000' }], error: null },
      ]);
      dbMock.from.mockReturnValue(builder);

      const ids = await fetchQualifiedContactIds();
      expect(ids).toHaveLength(1001);
      expect(ids[0]).toBe('c0');
      expect(ids[1000]).toBe('c1000');
      expect(builder.range).toHaveBeenCalledTimes(2);
      expect(builder.range).toHaveBeenNthCalledWith(1, 0, 999);
      expect(builder.range).toHaveBeenNthCalledWith(2, 1000, 1999);
    });
  });

  describe('saveLeadQualification', () => {
    it('upsertet mandantengebunden und setzt qualified_at beim ersten Speichern', async () => {
      const builder = makeBuilder({ data: null, error: null });
      dbMock.from.mockReturnValue(builder);

      await saveLeadQualification(INPUT);

      expect(builder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org-1',
          contact_id: 'contact-1',
          budget: true,
          authority: false,
          need: true,
          timeline: false,
          notes: 'Notiz',
        }),
        { onConflict: 'organization_id,contact_id' },
      );
      const payload = (builder.upsert as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
        qualified_at: string;
      };
      expect(payload.qualified_at).toBeTruthy();
    });

    it('erhält beim Update den bestehenden qualified_at-Wert', async () => {
      const builder = makeBuilder({
        data: { qualified_at: '2026-01-01T00:00:00Z' },
        error: null,
      });
      dbMock.from.mockReturnValue(builder);

      await saveLeadQualification(INPUT);

      const payload = (builder.upsert as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
        qualified_at: string;
      };
      expect(payload.qualified_at).toBe('2026-01-01T00:00:00Z');
    });

    it('lehnt fehlende Mandant-/Kontakt-IDs und zu lange Notizen ab', async () => {
      await expect(saveLeadQualification({ ...INPUT, organizationId: '' })).rejects.toThrow(
        /Mandant/,
      );
      await expect(saveLeadQualification({ ...INPUT, notes: 'x'.repeat(2001) })).rejects.toThrow(
        /2000/,
      );
      expect(dbMock.from).not.toHaveBeenCalled();
    });

    it('meldet Datenbankfehler', async () => {
      dbMock.from.mockReturnValue(
        makeBuilder({ data: null, error: null }, { message: 'rls denied' }),
      );

      await expect(saveLeadQualification(INPUT)).rejects.toThrow(/rls denied/);
    });
  });
});
