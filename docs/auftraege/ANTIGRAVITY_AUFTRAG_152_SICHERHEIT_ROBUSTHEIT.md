# Auftrag 152 – Sicherheits- und Robustheitsnacharbeit

**Ziel:** Die bestätigten Befunde F-02, F-03, E-1 bis E-4, H-01 bis H-03 und N-6 aus dem externen Audit sind behoben. Die Phasensortierung ist begrenzt und lädt nicht mehr alle Deals; der veröffentlichungsfähige Build ist eindeutig und per CI abgesichert; Einladungen und Audit-Log sind konsistent (Akteur, Atomarität, Ablauf, Zustellstatus); die Schema-Prüfung erzwingt RLS auf jeder `public`-Tabelle.

**Anlass:** [Triage des externen Audits](../reviews/2026-11-11-externes-audit-triage.md), §2.3.
**Vorgelagert:** Auftrag 151 (P06b, PR #177 gemergt).
**Nachgelagert:** Auftrag 153 (Live-KPI-Feed mandantengebunden, F-01), danach P08.
**Baseline:** `main`, Commit `4c97041` (nach Merge PR #177).
**Branch:** `auftrag-152-sicherheit-robustheit`
**Builder:** wird von Marc festgelegt (Standard: Claude Code). **Prüfer:** ein anderer Agent als der Builder gemäß `CLAUDE.md` §4.1 (Standard Codex auf GitHub). **Merge:** Marc.
**Status:** GEPLANT, noch nicht gebaut.

---

## 1. Befunde und Soll

| ID   | Ist (Baseline)                                                                                                                                                                                                                     | Soll                                                                                                                                                                                                                                                |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-02 | `crm-query-export/index.ts:319-320`: `sortByStage` setzt `fetchAllChunks`; alle Deals der Organisation werden in 1.000er-Blöcken geladen und im Speicher sortiert, ohne Gesamtgrenze.                                              | Kanonischer Phasen-Sortierschlüssel in der Datenbank (Sortierung und Paging serverseitig). Für Nicht-Exporte gilt eine harte Zeilengrenze; Überschreitung ergibt einen definierten Fehler statt unbegrenztem Laden. Exporte behalten ihr Verhalten. |
| F-03 | `npm run build` (`vite build`) umgeht `checkProductionConfig.mjs`; nur `build:production` prüft. Netlify-Deploy ist manuell (`dist/` per Drag-&-Drop), es gibt keinen erzwungenen Release-Pfad.                                    | `build:production` ist der einzige veröffentlichungsfähige Build, in README und Release-Ablauf verankert. CI testet die Konfigurationsprüfung mit negativen Fällen (fehlende Werte, Platzhalter, falsche Schlüsselrolle).                           |
| E-1  | Audit-Trigger schreibt `actor_id = auth.uid()` (`20260930_audit_log_hardening.sql`); Admin-Änderungen laufen über den Service-Role-Client der Edge Function, `auth.uid()` ist dort `NULL`.                                         | Der handelnde Admin wird in derselben Transaktion als Akteur erfasst (z. B. über transaktionslokale Einstellung oder RPC-Parameter). Kein Akteur `NULL` bei Admin-Aktionen; keine PII im Log.                                                       |
| E-2  | `manage-members/index.ts:~638`: `revokeInvitation` liest `status`, schreibt dann ohne `status = 'pending'`-Bedingung. Parallele Annahme und Widerruf können sich überschreiben.                                                    | Atomarer Übergang `pending → revoked` in einer Anweisung mit Bedingung `status = 'pending'` und `RETURNING`; keine Zeile zurück ergibt `INVITATION_NOT_PENDING`.                                                                                    |
| E-3  | `accept_organization_invitation` setzt eine abgelaufene Einladung auf `expired` und wirft danach `RAISE EXCEPTION`; die Transaktion rollt zurück, die Einladung bleibt `pending` und blockiert die Neueinladung derselben Adresse. | Ablauf wird ohne Rollback persistiert (Bereinigung vor der Annahme bzw. beim Anlegen einer neuen Einladung). Abgelaufene Einladungen blockieren keine Neueinladung.                                                                                 |
| E-4  | `authSucceeded = true` nach erfolgreichem `generateLink` (~Z. 564, 583); der Link wird nicht zugestellt, die Einladung gilt trotzdem als versendet.                                                                                | Zustand trennt „Einladung angelegt“ von „Zustellung bestätigt“. Bei Link-Fallback meldet die API `delivery: 'link_only'` (o. Ä.), die UI zeigt den Hinweis; „versendet“ nur nach `inviteUserByEmail`.                                               |
| H-01 | `accept_organization_invitation` prüft `current_user != 'postgres' AND auth.role() != 'service_role'`. In einer `SECURITY DEFINER`-Funktion ist `current_user` der Eigentümer; die Prüfung ist wirkungslos und irreführend.        | Irreführende Prüfung entfernen oder durch eine wirksame ersetzen. Schutz bleibt die Ausführungsberechtigung (`EXECUTE` nur für `service_role`); sie wird per SQL-Test belegt.                                                                       |
| H-02 | Pauschale `SELECT`-Grants für `authenticated` (Auftrag 143, `20261112_hosted_api_role_grants.sql`); RLS ist die Schutzgrenze.                                                                                                      | Schema-Test: jede `public`-Tabelle hat `ROW LEVEL SECURITY` aktiviert (Ausnahmenliste ausdrücklich und begründet). Grants bleiben unverändert.                                                                                                      |
| H-03 | Lokale Auth-Konfiguration permissiv; Hosted-Einstellungen nicht geprüft.                                                                                                                                                           | Soll-Ist-Abgleich der Hosted-Auth-Einstellungen (Signup, E-Mail-Bestätigung, Redirect-URLs, Passwortregeln, Rate Limits) als Dokument mit Soll-Werten. Kein Code, keine Änderung an der Hosted-Instanz ohne Marcs Freigabe.                         |
| N-6  | `claude.yml`, `claude-review.yml`, `codex-review-request.yml`, `codex-rework.yml`, `codex-status.yml` liegen im öffentlichen Repo; auf GitHub sind sie `disabled_manually`.                                                        | Die abgeschalteten Workflow-Dateien werden gelöscht; `CLAUDE.md`/`AGENTS.md`/Review-Doku sind an den neuen Stand angepasst. Aktiv bleiben `ci.yml`, `update-visual-baselines.yml`, `agent-review.yml`, CodeQL.                                      |

## 2. Verbindliche Grenzen

1. Schutzbereiche nach `CLAUDE.md` §6 bleiben unberührt (Diff leer). Insbesondere `src/types/**` und `src/services/data/**`. Falls eine Änderung der generierten Typen (`database.generated.ts`) nötig würde, stoppen und im Auftrag ausdrücklich ergänzen lassen.
2. Migrationen: genau eine neue Migration `supabase/migrations/2026111x_security_robustness.sql` (Datum fortlaufend nach `20261113`). Idempotent (`CREATE OR REPLACE`, `IF NOT EXISTS`). Bestehende Migrationen werden nicht verändert.
3. Keine neuen Abhängigkeiten. Keine Änderung der Hosted-Supabase-Instanz und keine Netlify-Änderung durch den Builder.
4. Öffentliche API-Verträge bleiben abwärtskompatibel; neue Felder (z. B. `delivery`) sind additiv. Bestehende Tests der Edge Functions bleiben grün oder werden begründet angepasst.
5. `max-lines` 400 je Datei.
6. Tests zuerst (rot vor grün), Rot-Lauf im BUILD_LOG protokollieren.
7. Löschen von Workflow-Dateien (N-6) nur diese fünf; `ci.yml`, `agent-review.yml`, `update-visual-baselines.yml` und CodeQL bleiben unverändert.
8. Betriebsregel aus 153 gilt weiter: bis zum Merge von 153 keine echten Kennzahlen in den Live-KPI-Feed einspeisen. Dieser Auftrag fasst den Feed nicht an.

## 3. Ziel-Dateien

| Pfad                                                                                                                    | Änderung                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_152_SICHERHEIT_ROBUSTHEIT.md`                                                       | Dieser Auftrag                                                                                |
| `supabase/functions/crm-query-export/index.ts`                                                                          | F-02: serverseitige Phasensortierung, harte Zeilengrenze für Nicht-Exporte                    |
| `supabase/migrations/2026111x_security_robustness.sql`                                                                  | Neu: Sortierschlüssel Phase, Akteur-Übergabe (E-1), Ablaufbereinigung (E-3), H-01 Bereinigung |
| `supabase/functions/manage-members/index.ts`                                                                            | E-1 Akteur, E-2 atomarer Widerruf, E-3 Ablaufbereinigung beim Einladen, E-4 Zustellstatus     |
| `supabase/functions/_shared/**`                                                                                         | Nur falls gemeinsame Helfer (Fehlercodes, Akteur) nötig sind                                  |
| `supabase/functions/__tests__/crmQueryExport.test.ts`, `crmStageFilter.test.ts`                                         | Sortierung/Grenze: Tests zuerst                                                               |
| `supabase/functions/__tests__/manageMembers.test.ts`                                                                    | Widerruf-Race, Ablauf, Zustellstatus, Akteur                                                  |
| `supabase/tests/audit_log.sql`, `member_management.sql`, `crm_query_export.sql`                                         | SQL-Tests: Akteur, Widerruf, Ablauf, EXECUTE-Rechte, Phasenschlüssel                          |
| `supabase/tests/rls_coverage.sql`                                                                                       | Neu: jede `public`-Tabelle hat RLS (H-02)                                                     |
| `src/features/**` (Einladungs-UI, nur falls `delivery` angezeigt wird)                                                  | Hinweistext „Link erzeugt, nicht versendet“; keine Gestaltungsänderung darüber hinaus         |
| `scripts/checkProductionConfig.mjs`, `scripts/__tests__/**` (oder bestehender Testort)                                  | F-03: negative Testfälle                                                                      |
| `package.json`                                                                                                          | Nur falls ein Skript für F-03 ergänzt wird (kein neues Paket)                                 |
| `.github/workflows/ci.yml`                                                                                              | F-03: Schritt für die Konfigurationsprüfung mit negativen Fällen                              |
| `.github/workflows/claude.yml`, `claude-review.yml`, `codex-review-request.yml`, `codex-rework.yml`, `codex-status.yml` | N-6: löschen                                                                                  |
| `README.md`                                                                                                             | F-03: Release-Ablauf mit `build:production`                                                   |
| `docs/dashboard/REVIEW_WORKFLOW.md`, `REVIEW_WORKFLOW_ANTIGRAVITY.md`, `CLAUDE.md`, `AGENTS.md`                         | N-6: Verweise auf gelöschte Workflows bereinigen (Abschnitt 4.2 in `CLAUDE.md`)               |
| `docs/security/HOSTED_AUTH_SOLL.md`                                                                                     | Neu: H-03 Soll-Werte und Abgleichsliste (Marc gleicht im Dashboard ab)                        |
| `BUILD_PLAN.md`, `docs/BUILD_LOG.md`                                                                                    | Status und Builder-Eintrag                                                                    |

## 4. Tasks

Reihenfolge je Block: Tests zuerst, dann Umsetzung.

- [x] T0 Einstieg: `git fetch`, Branch `auftrag-152-sicherheit-robustheit` von `main` (`4c97041` oder neuer), Triage lesen, Baseline-Diff für Schutzbereiche notieren.
- [x] T1 **F-02** Tests zuerst: Phasensortierung über Seitenränder und mehr als 1.000 Deals (Reihenfolge stimmt, Paging stimmt, kein Vollladen); Grenzfall über der harten Zeilengrenze. Dann: Sortierschlüssel in der Datenbank (Migration, z. B. generierte Spalte oder Funktion mit kanonischer Phasenreihenfolge), Abfrage nutzt `ORDER BY` + `range`. Nicht-Exporte erhalten eine harte Obergrenze; Exporte bleiben vollständig.
- [x] T2 **E-2** Tests zuerst: Widerruf trifft parallel auf Annahme (Annahme gewinnt, Widerruf meldet `INVITATION_NOT_PENDING`, Annahme wird nicht überschrieben). Dann: `UPDATE … WHERE id = … AND organization_id = … AND status = 'pending' RETURNING id`.
- [x] T3 **E-3** Tests zuerst: Abgelaufene `pending`-Einladung blockiert die Neueinladung nicht; Status nach Annahmeversuch ist dauerhaft `expired`. Dann: Ablaufbereinigung ohne Rollback (Bereinigung vor der Annahme und vor dem Prüfen offener Einladungen).
- [x] T4 **E-4** Tests zuerst: Fallback über `generateLink` liefert `delivery: 'link_only'`, `inviteUserByEmail` liefert `delivery: 'email'`. Dann: Zustellstatus in Edge Function und, falls angezeigt, UI-Hinweis.
- [x] T5 **E-1** Tests zuerst (SQL und Edge): Rollen-/Einladungs-/Deaktivierungsänderung durch einen Admin schreibt dessen `actor_id` ins Audit-Log; Systemaktionen ohne Admin behalten `NULL` bewusst. Dann: Akteur-Übergabe in derselben Transaktion (RPC-Parameter oder transaktionslokale Einstellung, vom Trigger gelesen), ohne PII.
- [x] T6 **H-01/H-02** Tests zuerst: SQL-Test `EXECUTE` auf `accept_organization_invitation` nur für `service_role`; `supabase/tests/rls_coverage.sql` prüft jede `public`-Tabelle auf RLS (Ausnahmen nur mit Begründung). Dann: irreführende `current_user`-Prüfung entfernen oder ersetzen.
- [x] T7 **F-03** Tests zuerst: negative Fälle für `checkProductionConfig` (URL fehlt, Schlüssel fehlt, Platzhalter, `service_role`-Schlüssel im Frontend). Dann: CI-Schritt, README-Abschnitt „Release-Build“, Hinweis in `BUILD_PLAN.md` offene Punkte (Netlify manuell: nur `build:production`-Ausgabe droppen).
- [x] T8 **N-6** Die fünf abgeschalteten Workflow-Dateien löschen; `CLAUDE.md` §4.2, `AGENTS.md` und `docs/dashboard/REVIEW_WORKFLOW*.md` anpassen. Vorher per `gh api` bestätigen, dass sie weiterhin `disabled_manually` sind.
- [x] T9 **H-03** `docs/security/HOSTED_AUTH_SOLL.md` mit Soll-Werten und Abgleichsliste schreiben; offene Abweichungen als Punkte für Marc listen. Keine Änderung an der Hosted-Instanz.
- [x] T10 Pflicht-Verifikation (Abschnitt 6), Schutzbereichs-Diff, BUILD_LOG-Builder-Eintrag, PR öffnen, Review anfordern.

## 5. Abnahme

- **F-02:** Phasensortierung liefert korrekte Reihenfolge und Seiten bei > 1.000 Deals, ohne alle Zeilen zu laden; Nicht-Export-Abfragen sind hart begrenzt.
- **F-03:** `npm run build:production` bricht bei fehlenden oder falschen Werten ab (belegt durch Test in CI); README nennt ihn als einzigen Release-Build.
- **E-1:** Jede Admin-Aktion (Einladen, Rolle ändern, Deaktivieren) hat im Audit-Log den handelnden Admin als `actor_id`.
- **E-2:** Parallel ausgeführte Annahme und Widerruf können sich nicht mehr überschreiben; genau eine Aktion gewinnt, die andere meldet `INVITATION_NOT_PENDING`.
- **E-3:** Eine abgelaufene Einladung wird dauerhaft `expired` und blockiert die Neueinladung nicht.
- **E-4:** API und UI unterscheiden „per E-Mail versendet“ von „Link erzeugt, nicht zugestellt“.
- **H-01/H-02:** `EXECUTE`-Rechte belegt; `rls_coverage.sql` grün; keine irreführende Prüfung mehr.
- **H-03:** Soll-Dokument liegt vor, offene Abweichungen sind für Marc aufgelistet.
- **N-6:** Die fünf Workflow-Dateien sind gelöscht; keine Dokumentation verweist noch auf sie als Teil des Ablaufs.
- Schutzbereichs-Diff leer; keine neuen Abhängigkeiten.

## 6. Pflicht-Verifikation

```
npx tsc --noEmit
npm run lint
npm run format:check
npm test
npm run verify
npm run build
npm run build:production      # mit gültiger Beispielkonfiguration; zusätzlich negativer Lauf ohne Werte
npm run size-limit
git diff 4c97041 -- src/simulation src/types src/context src/services/data src/features/resources   # muss leer sein
```

Zusätzlich: SQL-Tests unter `supabase/tests/` gegen die lokale Supabase-Instanz (wie in den Aufträgen 143 und 150), Deno-Tests der Edge Functions (`supabase/functions/__tests__`), CI-Checks `lint`, `typecheck`, `test`, `build`, `livekpi-verifiers`, `size-limit`, `e2e` grün. Keine Screenshot-Matrix nötig, solange nur der Hinweistext der Einladungs-UI geändert wird; ändert sich die Optik, gilt `CLAUDE.md` §7.

## 7. Offene Punkte und Risiken

- **Reihenfolge der Migration:** Die Migration darf `20261113_dashboard_v2_storage_and_revisions.sql` nicht berühren und muss auf dem Stand von `main` laufen.
- **E-1 Umsetzung:** Wahl zwischen RPC-Parameter und transaktionslokaler Einstellung trifft der Builder und begründet sie im BUILD_LOG; der Audit-Trigger darf bestehende Einträge nicht verändern.
- **F-02 Zeilengrenze:** Der konkrete Grenzwert wird im Auftrag-Eintrag festgelegt (Vorschlag: größer als die größte erwartete Organisationsgröße, dokumentiert); er darf Exporte nicht beschneiden.
- **N-6:** Falls ein Workflow doch noch aktiv ist, nicht löschen, sondern stoppen und Marc fragen.
- **Nicht Teil dieses Auftrags:** Live-KPI-Feed (F-01, Auftrag 153), Server-Parität der Dashboard-Layoutprüfung (offener Punkt aus Auftrag 151), Änderungen an der Hosted-Instanz.
