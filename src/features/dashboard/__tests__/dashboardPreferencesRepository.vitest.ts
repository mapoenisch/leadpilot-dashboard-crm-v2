// Auftrag 072 (Dashboard Teilauftrag 3): Repository der persönlichen Konfiguration.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const maybeSingle = vi.fn();
const select = vi.fn(() => ({ maybeSingle }));
const from = vi.fn(() => ({ select }));
const rpc = vi.fn();
const flags = { configured: true };

vi.mock('@/services/db/supabaseClient', () => ({
  get supabase() {
    return flags.configured ? { from, rpc } : null;
  },
  get isSupabaseConfigured() {
    return flags.configured;
  },
}));

import {
  classifyPreferencesError,
  loadPreferences,
  savePreferences,
} from '../data/dashboardPreferencesRepository';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';

beforeEach(() => {
  vi.clearAllMocks();
  flags.configured = true;
});

describe('classifyPreferencesError', () => {
  it('ordnet die Serverfehler fest zu', () => {
    expect(classifyPreferencesError({ message: 'LP_DASHBOARD_CONFLICT' })).toEqual({
      kind: 'konflikt',
    });
    expect(
      classifyPreferencesError({ message: 'LP_DASHBOARD_INVALID', details: 'zu viele Kacheln' }),
    ).toEqual({ kind: 'ungueltig', detail: 'zu viele Kacheln' });
    expect(classifyPreferencesError({ message: 'LP_DASHBOARD_NO_MEMBERSHIP' })).toEqual({
      kind: 'keine_mitgliedschaft',
    });
  });

  it('erkennt eine abgelaufene Sitzung', () => {
    expect(classifyPreferencesError({ code: 'PGRST303', message: 'JWT expired' })).toEqual({
      kind: 'sitzung_abgelaufen',
    });
    expect(classifyPreferencesError({ message: 'x' }, 401)).toEqual({ kind: 'sitzung_abgelaufen' });
  });

  it('macht aus allem anderen einen technischen Fehler ohne Rohmeldung', () => {
    expect(classifyPreferencesError({ message: 'relation does not exist' })).toEqual({
      kind: 'technisch',
    });
  });
});

describe('loadPreferences', () => {
  it('liest die eigene Zeile', async () => {
    maybeSingle.mockResolvedValue({
      data: { config: { version: 1, tiles: [] }, schema_version: 1, revision: 4, updated_at: 'T' },
      error: null,
      status: 200,
    });
    await expect(loadPreferences()).resolves.toEqual({
      ok: true,
      value: { config: { version: 1, tiles: [] }, schemaVersion: 1, revision: 4, updatedAt: 'T' },
    });
    expect(from).toHaveBeenCalledWith('executive_dashboard_preferences');
  });

  it('behandelt eine fehlende Zeile nicht als Fehler', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null, status: 200 });
    await expect(loadPreferences()).resolves.toEqual({ ok: true, value: null });
  });

  it('meldet eine abgelaufene Sitzung strukturiert', async () => {
    maybeSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST303', message: 'JWT expired' },
      status: 401,
    });
    await expect(loadPreferences()).resolves.toEqual({
      ok: false,
      error: { kind: 'sitzung_abgelaufen' },
    });
  });

  it('meldet technische Fehler ohne Rohmeldung, auch bei Ausnahmen', async () => {
    maybeSingle.mockRejectedValue(new Error('Netzwerk weg'));
    await expect(loadPreferences()).resolves.toEqual({ ok: false, error: { kind: 'technisch' } });
  });

  it('meldet fehlende Konfiguration', async () => {
    flags.configured = false;
    await expect(loadPreferences()).resolves.toEqual({
      ok: false,
      error: { kind: 'nicht_konfiguriert' },
    });
  });
});

describe('savePreferences', () => {
  it('ruft die Speicherfunktion mit erwarteter Revision und liefert die neue Revision', async () => {
    rpc.mockResolvedValue({ data: [{ revision: 5, updated_at: 'T2' }], error: null, status: 200 });
    await expect(savePreferences(DEFAULT_DASHBOARD_CONFIG, 4)).resolves.toEqual({
      ok: true,
      value: { revision: 5, updatedAt: 'T2' },
    });
    expect(rpc).toHaveBeenCalledWith('save_dashboard_preferences', {
      p_config: DEFAULT_DASHBOARD_CONFIG,
      p_expected_revision: 4,
    });
  });

  it.each([
    [{ message: 'LP_DASHBOARD_CONFLICT', code: 'P0001' }, { kind: 'konflikt' }],
    [
      { message: 'LP_DASHBOARD_INVALID', code: '22023', details: 'unbekanntes Feld' },
      { kind: 'ungueltig', detail: 'unbekanntes Feld' },
    ],
    [{ message: 'LP_DASHBOARD_NO_MEMBERSHIP', code: '42501' }, { kind: 'keine_mitgliedschaft' }],
  ])('meldet %o als %o', async (error, expected) => {
    rpc.mockResolvedValue({ data: null, error, status: 400 });
    await expect(savePreferences(DEFAULT_DASHBOARD_CONFIG, 1)).resolves.toEqual({
      ok: false,
      error: expected,
    });
  });

  it('behandelt eine unerwartete Antwort als technischen Fehler', async () => {
    rpc.mockResolvedValue({ data: [], error: null, status: 200 });
    await expect(savePreferences(DEFAULT_DASHBOARD_CONFIG, 0)).resolves.toEqual({
      ok: false,
      error: { kind: 'technisch' },
    });
  });
});
