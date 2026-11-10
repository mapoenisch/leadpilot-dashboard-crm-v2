# LeadPilot – Verbindlicher Plan nach v3.0.0: CRM-Verbindlichkeit (v3.1.0)

> **Status:** abgeschlossen — Release `v3.1.0` (Aufträge 136–142, letzter PR #162; Tag `v3.1.0` durch Marc nach dem Merge).
> **Gilt ab:** Auftrag 135 ist abgeschlossen und Tag `v3.0.0` ist gesetzt.
> **Builder dieses Plans:** Antigravity (frei wählbar nach `CLAUDE.md` §4.1) · **Prüfer:** ein anderer Agent, Standard Codex (GitHub-App) · **Merge und Release:** Marc.
> Teil-Aufträge liegen in diesem Dokument. Der Builder legt zu Beginn jedes Teil-Auftrags die Datei `docs/auftraege/ANTIGRAVITY_AUFTRAG_XXX_*.md` mit dem Inhalt des jeweiligen Abschnitts an (`CLAUDE.md` §3, §5).

**Ziel:** Was v3.0.0 als operatives CRM verspricht, wird dauerhaft in der Datenbank gespeichert und für alle Nutzer eines Mandanten gleich sichtbar.

**Architektur:** Schreibvorgänge laufen über geprüfte Postgres-Funktionen (RPC) mit Rollen-, Mandanten- und Konfliktprüfung sowie Audit-Eintrag. Das Frontend liest weiter über `crm-query-export` und mutiert über kleine Services in `src/features/crm/services/`. Browser-Speicher entfällt als Datenquelle für Fachzustand.

**Tech Stack:** React 18, TypeScript, TanStack Query, Supabase (Postgres, RLS, Edge Functions), pgTAP, Vitest, Playwright.

---

## 1. Warum dieser Plan und nicht der Vorschlag

Der Vorschlag beschreibt den Stand v2.5.0. Geprüft am Code von `origin/main` (`9c87838`) ergibt sich:

| Befund im Code | Fundstelle | Folge |
| --- | --- | --- |
| Kanban-Phasenwechsel landen nur in `sessionStorage` | `useDealStageOverrides` in `src/features/crm/utils/crmStageHelper.ts` | Nach Tab-Ende weg, für Kollegen unsichtbar |
| BANT-Qualifizierung liegt nur in `sessionStorage` | `LeadQualificationDrawer.tsx` | dito |
| „Qualifizierte Leads" liegen in `sessionStorage`/`localStorage` | `leadConversionService.ts` | dito; fließt in den Live-Funnel ein |
| Deal-Konvertierung schreibt direkt, RLS erlaubt nur `admin` | `leadConversionService.ts`, `tenant_write_deals` | Manager scheitern; bei fehlender Organisation Rückfall auf die Demo-Organisation |
| `stageEnteredAt` und `daysInStage` werden nirgends befüllt; die Tabelle hat keine Spalte dafür | `funnelAnalyticsService.ts`, `supabase/schema.sql` | Die Engpass-Erkennung über 30 Tage kann bei echten Daten nicht auslösen |
| `AIInsightDrawer` zeigt vorgefertigten Text mit „Powered by LeadPilot Gemini AI Engine", ist aber nirgends eingebunden | `src/components/ai/` | Toter Code mit falscher Aussage |
| Release Notes v3.0.0 nennen eine „Aktivitätshistorie" im Drawer | `docs/releases/V3.0.0.md`, Drawer enthält keine | Falsche Aussage |

Damit ist die Priorität klar: Ein CRM, das Änderungen beim Schließen des Tabs vergisst, darf keine weitere Schicht bekommen. Alerts, Webhooks und KI würden auf Daten aufsetzen, die gar nicht gespeichert werden.

### Entscheidung je Vorschlag

| Vorschlag | Urteil | Begründung |
| --- | --- | --- |
| 1 Deployment/Staging | **Vertagt** auf den Folgeplan | Braucht Marcs Wahl von Provider und gehostetem Supabase. Annahme korrigiert: E2E läuft bereits gegen ein echtes, flüchtiges Supabase in der CI. PR-Previews sind bei einem öffentlichen Repo ohne getrennte Datenbank nicht verantwortbar. |
| 2 KI / Copilot | **Abgelehnt** für jetzt | Zuerst müssen Daten belastbar sein. Predictive Scoring braucht Interaktionsdaten, die es nicht gibt; LLM-Anbindung bringt Kosten, Keys und Datenabfluss. Sofortmaßnahme: Falsch-KI entfernen (136). |
| 3 Alerting | **Vertagt**, erster Kandidat im Folgeplan | Sinnvoll, aber erst nach echten Phasendaten (137–140). |
| 4 Inbound-Webhook | **Vertagt**, Kandidat im Folgeplan | `live-kpi-ingest` ist ein gutes Muster. Neue Leads einzuspeisen nützt erst, wenn Qualifizierung gespeichert wird. |
| 4 Bidirektionaler HubSpot-Sync | **Abgelehnt** | Hoher Dauerbetrieb, Konfliktlogik und Zugangsdaten für ein fiktives Unternehmen. Einseitiger Import reicht. |
| 5 Legacy-Dashboard entfernen | **Angenommen** (141) | Marcs Entscheidung E3 befristete die Altansicht bis v2.4.0. Sie kostet zusätzlich einen CI-Build. |
| 5 WebP-Altlasten | **Abgelehnt** für jetzt | Annahme falsch: Die Dateien liegen in `public/` und nicht im JS-Bundle. Rund 6 MB im Repo rechtfertigen den Umbau von g67/g104 nicht. |
| 5 Screenreader-Matrix | **Reduziert** | Screenreader lassen sich nicht sinnvoll vollautomatisch prüfen. Neue Kanban-Abläufe bekommen `aria-live` (138); die Lücke bleibt in `ACCESSIBILITY.md` offen benannt. |
| Bonus PWA/Offline | **Abgelehnt** | Neue Abhängigkeit, ohne Deployment wertlos; Offline-Schreiben würde das Konfliktproblem verschärfen. |

---

## 2. Teil-Aufträge und Reihenfolge

```
136 Plan in Kraft setzen, falsche Aussagen entfernen
 ↓
137 Datenbank: Phasenwechsel (RPC, Historie, Verweildauer)
 ↓
138 Kanban/Tabelle speichern serverseitig
 ↓
139 Qualifizierung und Konvertierung speichern serverseitig
 ↓
140 Funnel nutzt echte Verweildauer
 ↓
141 Legacy-Dashboard entfernen
 ↓
142 Release v3.1.0
```

Streng seriell, ein PR je Teil-Auftrag, vom jeweils aktuellen `main`. Branch: `antigravity/auftrag-XXX-kurzname`.

## 3. Globale Grenzen (gelten für jeden Teil-Auftrag)

- Ablauf nach `CLAUDE.md` §4.1: Der Builder baut und arbeitet nach, ein anderer Agent prüft, Marc merged. Antigravity prüft in diesem Plan nicht, solange es baut.
- Keine neuen npm-Pakete.
- Schutzbereiche nach §6 bleiben unberührt, Diff muss leer sein. **Ausnahme nur:** `src/types/crm.ts` in 137 (ein optionales Feld).
- Migrationen sind additiv: kein `DROP` von Spalten oder Policies mit Daten, bestehende Migrationen werden nicht geändert. `tenant_write_deals` bleibt unverändert.
- Unbekanntes bleibt unbekannt: Keine erfundenen Verweildauern oder rückwirkenden Historien. Bestandsdaten erhalten `stage_entered_at = NULL`.
- Pflicht-Verifikation §7 und BUILD_LOG-Eintrag je PR. UI-Änderungen zusätzlich Screenshot-Matrix 1440/768/375 px, dark/light, 0 px Überlauf.
- Kanonische Phasen sind genau die sieben deutschen Labels aus `KANBAN_STAGES`.

## 4. Prüfschwerpunkte

1. **Zwei Nutzer verschieben denselben Deal gleichzeitig:** Der zweite bekommt einen sichtbaren Konflikt, die Karte zeigt den Serverstand (Test in 137, 138).
2. **Viewer oder fremder Mandant ruft die RPC direkt auf:** Abweisung und keine Änderung, unabhängig vom UI (137, 139).
3. **Bestandsdeals mit HubSpot-Rohwerten wie `closedwon`:** Verschieben funktioniert, `p_expected_stage` vergleicht den gespeicherten Rohwert (137, 138).
4. **Netzfehler beim Verschieben:** Karte springt zurück, Fehler wird angesagt (138).
5. **Doppelklick auf „In Deal umwandeln":** Es entsteht genau ein Deal (139).

---

## Teil-Auftrag 136 — Plan in Kraft setzen, falsche Aussagen entfernen

**Dateien:**

- Löschen: `src/components/ai/AIInsightDrawer.tsx`, `src/components/ai/__tests__/AIInsightDrawer.ui.vitest.tsx`
- Ändern: `BUILD_PLAN.md`, `docs/releases/V3.0.0.md`, `docs/BUILD_LOG.md`

- [ ] `git grep AIInsightDrawer` zeigt außer den beiden Dateien nichts, dann löschen.
- [ ] `BUILD_PLAN.md`: „Nächster Auftrag" zeigt auf diesen Plan und 137.
- [ ] `docs/releases/V3.0.0.md`: Abschnitt „Bekannte Einschränkungen (Nachtrag 09.11.2026)" ans Ende: Phasenwechsel, BANT und Qualifizierungsstatus liegen nur im Browser; Engpass-Erkennung hat ohne Phasendatum keine Datenbasis; die Aktivitätshistorie existiert nicht. Bestehender Text bleibt unverändert.
- [ ] Verifikation §7, PR.

**Abnahme:** Kein Treffer für `Gemini AI Engine` in `src/`. Build grün.

---

## Teil-Auftrag 137 — Datenbank: Phasenwechsel

**Dateien:**

- Neu: `supabase/migrations/20261110_deal_stage_tracking.sql`, `supabase/tests/deal_stage_tracking.sql`
- Ändern: `supabase/functions/crm-query-export/resourceConfig.ts` (Spalte `stage_entered_at`, Item-Feld `stageEnteredAt`), Deno-Test dazu, `src/types/crm.ts` (`ImportedFunnelDeal.stageEnteredAt?: string`, **Schutzbereich hiermit ausdrücklich freigegeben**), `.github/workflows/ci.yml` nur falls pgTAP-Dateien dort einzeln gelistet sind

**Schnittstelle:**

```sql
ALTER TABLE imported_funnel_deals ADD COLUMN stage_entered_at TIMESTAMPTZ NULL;

CREATE TABLE deal_stage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  deal_id TEXT NOT NULL REFERENCES imported_funnel_deals(id) ON DELETE CASCADE,
  from_stage TEXT NULL,
  to_stage TEXT NOT NULL,
  actor_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

move_deal_stage(p_deal_id TEXT, p_expected_stage TEXT, p_new_stage TEXT)
  RETURNS TABLE (deal_id TEXT, stage TEXT, stage_entered_at TIMESTAMPTZ)
```

Entscheidungen:

- `SECURITY DEFINER`, `SET search_path = public, pg_temp`, Zeile mit `FOR UPDATE` sperren, nur für `authenticated` ausführbar.
- Fehlercodes per `ERRCODE`: `LP403` (Rolle nicht `admin`/`manager`), `LP404` (Deal fehlt oder fremder Mandant, nicht unterscheidbar), `LP409` (`stage` ≠ `p_expected_stage`), `LP422` (`p_new_stage` ist keines der sieben Labels).
- `p_expected_stage` wird mit dem gespeicherten Rohwert verglichen. Gleiche Phase (normalisiert) ist ein No-op ohne Event.
- Erfolg: `stage` und `stage_entered_at = NOW()` setzen, Event schreiben, `audit_log`-Eintrag mit `action = 'crm.deal.stage_changed'`, `target_type = 'deal'`, `details = {from, to}` nach Muster `20261001_run_control.sql`.
- `deal_stage_events`: RLS an, `SELECT` für aktive Mitglieder des Mandanten, keine Schreib-Policy.

**pgTAP (je ein Test):** `manager_moves_deal`, `admin_moves_deal`, `viewer_rejected_lp403`, `foreign_tenant_lp404`, `stale_expected_lp409`, `invalid_stage_lp422`, `same_stage_no_event`, `raw_hubspot_stage_moves` (`closedwon` als erwartet), `event_and_audit_written`, `direct_event_insert_denied`, `existing_deals_null_entered_at`.

- [ ] Tests zuerst, rot. Dann Migration, grün mit `supabase test db`.
- [ ] Deno-Test: Antwort von `deals` enthält `stageEnteredAt`. `deno check --frozen-lockfile` und `deno test` grün.
- [ ] Verifikation §7, PR. Keine UI-Änderung, keine Screenshots.

---

## Teil-Auftrag 138 — Kanban und Tabelle speichern serverseitig

**Dateien:**

- Neu: `src/features/crm/services/dealStageService.ts`, `src/features/crm/hooks/useMoveDealStage.ts`, jeweils Tests; `e2e/crm-deals-persistence.spec.ts`
- Ändern: `src/features/crm/pages/DealsPage.tsx`, `src/features/crm/utils/crmStageHelper.ts`, `src/features/crm/components/DealsKanbanBoard.tsx`, `DealKanbanCard.tsx`, `src/features/vertrieb/pages/FunnelPage.tsx`, `.github/workflows/ci.yml` (Spec in den E2E-Lauf)
- Löschen: Client-Paging und Volldatenlogik (`dealsClientView.ts`, soweit nur für Overrides nötig), Tests dazu (`DealsPage.identity`, `DealsPage.fullbase` und Override-Fälle in `DealsPage.findings` sowie `crmStageHelper`)

**Schnittstelle:**

```ts
export type MoveDealStageErrorCode = 'forbidden' | 'not_found' | 'conflict' | 'invalid_stage' | 'network';
export class MoveDealStageError extends Error { code: MoveDealStageErrorCode; }
export function moveDealStage(input: { dealId: string; expectedStage: string; newStage: string }):
  Promise<{ dealId: string; stage: string; stageEnteredAt: string }>;
export function useMoveDealStage(organizationId: string | undefined): UseMutationResult<…>;
```

Entscheidungen:

- `LP4xx` wird auf die Codes abgebildet. Optimistisches Update im Cache, bei Fehler Rücksprung. Immer `crmKeys.listsOf('deals')` und `crmKeys.pipelineOverview()` invalidieren.
- Filter, Suche, Sortierung und Paginierung laufen wieder ausschließlich serverseitig. `useDealStageOverrides`, `readStageOverrides`, `writeStageOverrides`, `getDealStageOverridesStorageKey` entfallen. Alte Tab-Werte werden nicht migriert.
- `viewer`: Karten nicht verschiebbar, kein Tastatur-Verschieben. Während einer laufenden Mutation ist die Karte gesperrt.
- Texte: Konflikt „Dieser Deal wurde inzwischen geändert. Die aktuelle Phase wird angezeigt."; Netzfehler „Die Phase konnte nicht gespeichert werden."; Erfolg per `aria-live="polite"`: „{Deal} nach {Phase} verschoben."

**Tests:** `moveDealStage` bildet `LP403/404/409/422` ab; `useMoveDealStage` rollt bei Fehler zurück; `DealsPage` ruft bei Viewer keine Mutation auf; E2E `phase_bleibt_nach_reload`, `phase_in_zweitem_kontext_sichtbar`, `viewer_kann_nicht_verschieben`, `konflikt_zeigt_serverstand`.

- [ ] Tests zuerst, dann Umbau, dann Löschen. `git grep -E 'StageOverrides'` in `src/` ist leer.
- [ ] Visuelle Baselines nur bei tatsächlicher Abweichung über `visual-baselines/**` erneuern.
- [ ] Verifikation §7, Screenshot-Matrix, PR.

---

## Teil-Auftrag 139 — Qualifizierung und Konvertierung speichern serverseitig

**Dateien:**

- Neu: `supabase/migrations/20261111_lead_qualification.sql`, `supabase/tests/lead_qualification.sql`, `src/features/crm/services/leadQualificationService.ts`, Tests
- Ändern: `src/features/crm/services/leadConversionService.ts`, `src/features/crm/components/LeadQualificationDrawer.tsx`, `src/features/crm/pages/LeadsPage.tsx`, `src/features/vertrieb/pages/FunnelPage.tsx`

**Schnittstelle:**

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

Entscheidungen:

- RLS `lead_qualifications`: `SELECT` für aktive Mitglieder, Schreiben für `admin`/`manager`, jeweils mandantengebunden.
- RPC ist `SECURITY DEFINER` mit den Fehlercodes aus 137 und transaktional: Deal mit ID `d-conv-<gen_random_uuid()>` und `stage_entered_at = NOW()`, Event mit `from_stage = NULL`, `qualified_at` setzen, Audit `crm.lead.converted`. Bereits konvertierter Kontakt: `LP409`. Betrag `<= 0`: `LP422`.
- Das Frontend setzt weder ID noch Organisation. Der Rückfall auf `00000000-0000-0000-0000-000000000001` entfällt; ohne Sitzung wird der Dialog nicht abgeschickt.
- Ein Lead wird in v3.1 genau einmal konvertiert.
- Drawer: Vorschlagswerte aus dem Score bleiben, solange keine gespeicherte Zeile existiert. Speichern per Button statt Autosave; `viewer` sieht nur lesend.
- `getQualifiedLeadIds`, `markLeadAsQualified` und alle `leadpilot_crm_*`-Schlüssel für diese Daten entfallen. Der Funnel liest qualifizierte Kontakte über eine Query auf `lead_qualifications`.

**pgTAP:** `manager_converts`, `viewer_rejected`, `foreign_contact_lp404`, `second_conversion_lp409`, `zero_amount_lp422`, `conversion_atomic_on_failure`, `qualification_tenant_isolated`.
**Vitest:** `drawer_laedt_gespeicherte_bant_werte`, `viewer_kann_nicht_speichern`, `doppelklick_einmal_aufgerufen`.
**E2E:** `bant_bleibt_nach_reload`.

- [ ] Tests zuerst, dann Migration, Service und UI.
- [ ] `git grep -E 'leadpilot_crm_(bant|qualified)'` in `src/` ist leer.
- [ ] Verifikation §7, Screenshot-Matrix, PR.

---

## Teil-Auftrag 140 — Funnel nutzt echte Verweildauer

**Dateien:** `src/features/vertrieb/services/funnelAnalyticsService.ts`, `src/features/vertrieb/components/FunnelBottleneckAlert.tsx`, `src/features/vertrieb/pages/FunnelPage.tsx`, Tests.

Entscheidungen:

- `stageEnteredAt` aus den Deals ist die einzige Quelle. `getEffectiveDealStage` wird ohne Overrides vereinfacht; `daysInStage` entfällt, wenn nur Tests es befüllen.
- Deals ohne Phasendatum zählen nicht als Engpass. Der Alert nennt sie offen: „{n} Deals ohne bekannte Verweildauer (vor v3.1 angelegt)." Bei 0 keine Zeile.
- Der Grenzwert 30 Tage bleibt.

**Tests:** `deal_mit_31_tagen_ist_engpass`, `deal_mit_30_tagen_ist_keiner`, `deal_ohne_datum_wird_gezaehlt_aber_nicht_gewarnt`, `alle_ohne_datum_zeigt_keine_entwarnung`.

Letzterer ist wichtig: Sind alle Daten unbekannt, darf nicht „Alle Deals verweilen innerhalb der geplanten Zykluszeiten" erscheinen.

- [ ] Tests zuerst, Umsetzung, Verifikation §7, Screenshot-Matrix, PR.

---

## Teil-Auftrag 141 — Legacy-Dashboard entfernen

**Dateien:**

- Löschen: `src/features/overview/pages/ExecutiveDashboardPage.tsx`, `src/components/executiveCockpit/**` (soweit nach `git grep` unbenutzt), `e2e/dashboard-rollback.spec.ts`, zugehörige Tests
- Ändern: `src/features/dashboard/model/dashboardRollout.ts`, `src/features/dashboard/pages/executiveDashboardEntry.ts`, `src/app/App.tsx`, `src/app/routes.tsx`, `src/app/routePages.tsx`, `src/features/overview/OverviewView.tsx`, `src/vite-env.d.ts`, `.env.example`, `.github/workflows/ci.yml`, `docs/dashboard/` soweit dort der Schalter beschrieben ist

Entscheidungen:

- `isPersonalDashboardEnabled` und `VITE_EXECUTIVE_DASHBOARD_V2` entfallen ersatzlos. `DASHBOARD_PATH`, `TILE_DETAIL_*`, `tileDetailPath`, `tileIdFromPath` bleiben.
- `src/domain/executiveCockpitData` bleibt, weil das neue Dashboard es nutzt.
- `ci.yml`: Rückschalt-Build, Rollback-Spec und der anschließende Lighthouse-Neubau entfallen; die Lighthouse-Prüfung läuft auf dem regulären Build.
- Rückweg ist ab jetzt der Tag `v3.0.0`. Das steht im PR und später in den Release Notes.

- [ ] `git grep -E 'EXECUTIVE_DASHBOARD_V2|isPersonalDashboardEnabled|ExecutiveCockpit\b'` ist in `src/`, `e2e/`, `.github/`, `.env.example` leer.
- [ ] `/dashboard` und `/dashboard/tiles/:tileId` laufen über die bestehenden E2E-Specs. `npx size-limit` grün.
- [ ] Verifikation §7, Screenshot-Matrix, PR.

---

## Teil-Auftrag 142 — Release v3.1.0

Nach Muster von Auftrag 134.

**Dateien:** `package.json`, `package-lock.json`, `src/features/auth/pages/LoginPage.tsx` (Versionsanzeige), `docs/releases/V3.1.0.md`, `BUILD_PLAN.md`, `README.md` (Versionszeile), `ACCESSIBILITY.md` (Stand), dieser Plan (Status), `docs/BUILD_LOG.md`, Screenshot-Harness und Matrix für die Login-Seite.

Release Notes müssen enthalten:

- Migrationen `20261110` und `20261111` sind auf gehostete Instanzen anzuwenden, **bevor** das neue Frontend ausgeliefert wird.
- Bestandsdeals haben keine Verweildauer; Werte aus Browser-Speichern werden nicht übernommen.
- Manager dürfen jetzt verschieben und konvertieren.
- Altes Dashboard entfernt, Rückweg Tag `v3.0.0`.
- Die Einschränkungen aus dem v3.0.0-Nachtrag sind behoben.

Tag `v3.1.0` und GitHub-Release setzt Marc nach dem Merge.

---

## 5. Danach

Nach v3.1.0 entscheidet Marc über den Folgeplan. Empfohlene Reihenfolge der Kandidaten:

1. Deployment mit gehostetem Supabase, sobald Marc den Provider gewählt hat.
2. In-App-Alerts auf Basis echter Phasendaten.
3. Einseitiger Inbound-Webhook für Leads nach Muster `live-kpi-ingest`.

KI kommt erst wieder auf den Tisch, wenn es echte Interaktionsdaten gibt.
