/**
 * leadQualificationService.ts
 * Auftrag 139: BANT-Qualifizierung und Qualifizierungsstatus liegen in der
 * Tabelle `lead_qualifications` (mandantengebunden, RLS-geschützt).
 * Kein Browser-Speicher mehr: sessionStorage/localStorage sind keine
 * Datenquelle für Fachzustand.
 */
import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import { crmKeys } from '@/services/query/queryKeys';

export interface LeadQualification {
  contactId: string;
  budget: boolean;
  authority: boolean;
  need: boolean;
  timeline: boolean;
  notes: string;
  qualifiedAt: string | null;
  updatedAt: string | null;
}

export interface SaveLeadQualificationInput {
  organizationId: string;
  contactId: string;
  budget: boolean;
  authority: boolean;
  need: boolean;
  timeline: boolean;
  notes: string;
}

export const LEAD_QUALIFICATIONS_KEY = crmKeys.list('lead_qualifications', { scope: 'all' });

export function leadQualificationKey(contactId: string) {
  return crmKeys.list('lead_qualifications', { contactId });
}

interface QualificationRow {
  contact_id?: unknown;
  budget?: unknown;
  authority?: unknown;
  need?: unknown;
  timeline?: unknown;
  notes?: unknown;
  qualified_at?: unknown;
  updated_at?: unknown;
}

function parseRow(row: QualificationRow | null | undefined): LeadQualification | null {
  if (!row || typeof row.contact_id !== 'string') return null;
  return {
    contactId: row.contact_id,
    budget: row.budget === true,
    authority: row.authority === true,
    need: row.need === true,
    timeline: row.timeline === true,
    notes: typeof row.notes === 'string' ? row.notes : '',
    qualifiedAt: typeof row.qualified_at === 'string' ? row.qualified_at : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

/** Liest die gespeicherte Qualifizierung eines Kontakts (null = noch nicht gespeichert). */
export async function fetchLeadQualification(contactId: string): Promise<LeadQualification | null> {
  if (!isSupabaseConfigured || !supabase || !contactId) return null;
  const { data, error } = await supabase
    .from('lead_qualifications')
    .select('contact_id, budget, authority, need, timeline, notes, qualified_at, updated_at')
    .eq('contact_id', contactId)
    .maybeSingle();
  if (error) throw error;
  return parseRow(data as QualificationRow | null);
}

/** Alle Kontakt-IDs mit gesetztem qualified_at (für Listen- und Funnel-Ansichten). */
export async function fetchQualifiedContactIds(): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  // max_rows=1000 begrenzt einzelne Antworten: seitenweise mit stabiler
  // Sortierung laden, bis eine Seite nicht mehr voll ist.
  const PAGE = 1000;
  const ids: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('lead_qualifications')
      .select('contact_id')
      .not('qualified_at', 'is', null)
      .order('contact_id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as { contact_id?: unknown }[];
    for (const row of rows) {
      if (typeof row.contact_id === 'string') ids.push(row.contact_id);
    }
    if (rows.length < PAGE) break;
  }
  return ids;
}

/**
 * Speichert die BANT-Qualifizierung eines Kontakts (Upsert, mandantengebunden
 * über RLS).qualified_at wird beim ersten Speichern gesetzt und danach
 * eingefroren; updated_by/updated_at setzt ein Trigger in der Datenbank.
 */
export async function saveLeadQualification(input: SaveLeadQualificationInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Keine CRM-Datenbank verbunden. Die Qualifizierung wurde nicht gespeichert.');
  }
  if (!input.organizationId || !input.contactId) {
    throw new Error('Ohne Mandant und Kontakt kann nicht gespeichert werden.');
  }
  if (input.notes.length > 2000) {
    throw new Error('Die Notizen dürfen maximal 2000 Zeichen lang sein.');
  }

  // qualified_at hält den Zeitpunkt der ersten Qualifizierung: beim Update
  // bleibt der vorhandene Wert erhalten, beim Anlegen wird jetzt gesetzt.
  const { data: existing, error: readError } = await supabase
    .from('lead_qualifications')
    .select('qualified_at')
    .eq('organization_id', input.organizationId)
    .eq('contact_id', input.contactId)
    .maybeSingle();
  if (readError) {
    throw new Error(`Fehler beim Laden der Qualifizierung: ${readError.message}`);
  }
  const existingQualifiedAt =
    existing && typeof (existing as { qualified_at?: unknown }).qualified_at === 'string'
      ? ((existing as { qualified_at: string }).qualified_at ?? null)
      : null;

  const { error } = await supabase.from('lead_qualifications').upsert(
    {
      organization_id: input.organizationId,
      contact_id: input.contactId,
      budget: input.budget,
      authority: input.authority,
      need: input.need,
      timeline: input.timeline,
      notes: input.notes,
      qualified_at: existingQualifiedAt ?? new Date().toISOString(),
    },
    { onConflict: 'organization_id,contact_id' },
  );
  if (error) {
    throw new Error(`Fehler beim Speichern der Qualifizierung: ${error.message}`);
  }
}
