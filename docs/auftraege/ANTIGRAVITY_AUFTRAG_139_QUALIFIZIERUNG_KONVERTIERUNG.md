# Auftrag 139 — Qualifizierung und Konvertierung speichern serverseitig

**Quelle:** `docs/superpowers/plans/2026-11-09-crm-verbindlichkeit-v3-1-plan.md`, Teil-Auftrag 139.
**Builder:** Devin · **Prüfer:** ein anderer Agent, Standard Codex (GitHub-App) · **Merge:** Marc.
**Voraussetzung:** Auftrag 138 ist gemergt (PR #159), `move_deal_stage` und Phasen-Persistenz stehen zur Verfügung.

## Ziel

BANT-Qualifizierung und Qualifizierungsstatus liegen nicht mehr in `sessionStorage`/`localStorage`, sondern in der Tabelle `lead_qualifications` (mandantengebunden, RLS-geschützt). Die Lead-zu-Deal-Konvertierung läuft transaktional über die RPC `convert_lead_to_deal`. Der Funnel liest qualifizierte Kontakte aus der Datenbank.

## Ziel-Dateien

**Neu:**

- `supabase/migrations/20261111_lead_qualification.sql`
- `supabase/tests/lead_qualification.sql`
- `src/features/crm/services/leadQualificationService.ts`
- `src/features/crm/services/__tests__/leadQualificationService.unit.vitest.ts`
- `src/features/crm/components/__tests__/LeadQualificationDrawer.ui.vitest.tsx` (falls nicht vorhanden, sonst erweitern)
- Tests nach Bestand

**Ändern:**

- `src/features/crm/services/leadConversionService.ts`
- `src/features/crm/components/LeadQualificationDrawer.tsx`
- `src/features/crm/pages/LeadsPage.tsx`
- `src/features/vertrieb/pages/FunnelPage.tsx`
- `e2e/` (Spec für `bant_bleibt_nach_reload`, ggf. bestehende CRM-Spec erweitern)
- `.github/workflows/ci.yml` (falls neue Spec nötig)
- `BUILD_PLAN.md` (Nächster Auftrag: 140)
- `docs/BUILD_LOG.md`

## Schnittstelle

```sql
CREATE TABLE lead_qualifications (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  budget BOOLEAN NOT NULL DEFAULT FALSE,
  authority BOOLEAN NOT NULL DEFAULT FALSE,
  need BOOLEAN NOT NULL DEFAULT FALSE,
  timeline BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
  qualified_at TIMESTAMPTZ NULL,
  updated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, contact_id)
);
ALTER TABLE imported_funnel_deals ADD COLUMN source_contact_id TEXT NULL REFERENCES contacts(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX uq_deals_source_contact ON imported_funnel_deals (organization_id, source_contact_id) WHERE source_contact_id IS NOT NULL;

convert_lead_to_deal(p_contact_id TEXT, p_deal_name TEXT, p_stage TEXT, p_amount NUMERIC, p_close_date DATE, p_pipeline TEXT)
  RETURNS imported_funnel_deals
```

## Entscheidungen

- RLS `lead_qualifications`: `SELECT` für aktive Mitglieder, Schreiben für `admin`/`manager`, jeweils mandantengebunden.
- RPC ist `SECURITY DEFINER` mit den Fehlercodes aus 137 (`LP403`, `LP404`, `LP409`, `LP422`) und transaktional: Deal mit ID `d-conv-<gen_random_uuid()>` und `stage_entered_at = NOW()`, Event mit `from_stage = NULL`, `qualified_at` setzen, Audit `crm.lead.converted`. Bereits konvertierter Kontakt: `LP409`. Betrag `<= 0`: `LP422`.
- Das Frontend setzt weder ID noch Organisation. Der Rückfall auf `00000000-0000-0000-0000-000000000001` entfällt; ohne Sitzung wird der Dialog nicht abgeschickt.
- Ein Lead wird in v3.1 genau einmal konvertiert.
- Drawer: Vorschlagswerte aus dem Score bleiben, solange keine gespeicherte Zeile existiert. Speichern per Button statt Autosave; `viewer` sieht nur lesend.
- `getQualifiedLeadIds`, `markLeadAsQualified` und alle `leadpilot_crm_*`-Schlüssel für diese Daten entfallen. Der Funnel liest qualifizierte Kontakte über eine Query auf `lead_qualifications`.

## Tests

**pgTAP:** `manager_converts`, `viewer_rejected`, `foreign_contact_lp404`, `second_conversion_lp409`, `zero_amount_lp422`, `conversion_atomic_on_failure`, `qualification_tenant_isolated`.
**Vitest:** `drawer_laedt_gespeicherte_bant_werte`, `viewer_kann_nicht_speichern`, `doppelklick_einmal_aufgerufen`.
**E2E:** `bant_bleibt_nach_reload`.

## Ablauf

- [x] Tests zuerst (rot), dann Migration, Service und UI.
- [x] `git grep -E 'leadpilot_crm_(bant|qualified)'` in `src/` ist leer.
- [x] Verifikation `CLAUDE.md` §7, Screenshot-Matrix, PR.
