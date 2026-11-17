# Auftrag 162 – Dashboard-Editor: Team-Freigaben im Server – Teams, Rechte, Team-Dashboards, Kopieren (P11a)

**Ziel:** Ein Admin kann innerhalb seiner Organisation Teams anlegen und Mitglieder zuordnen. Dashboards lassen sich einem Team freigeben: Alle Teammitglieder sehen sie, Admins und Manager mit aktiver Teammitgliedschaft dürfen sie bearbeiten. Wer das Team verlässt, verliert sofort seine Rechte, das Dashboard bleibt für das Team erhalten. Dieser Auftrag baut **nur Datenbank und Dienstschicht** (Migration, RLS, RPCs, pgTAP, TypeScript-Dienste mit Tests, Spezifikation). Die Oberfläche folgt in Auftrag 163 (P11b).

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P11 (§6), §4.E, §5.1, §8; Gegenprüfung B1, L4 (§9.3).
**Fachgrundlage:** [EDITOR_UX_FACHVERTRAEGE_145.md](../dashboard/EDITOR_UX_FACHVERTRAEGE_145.md) §6 (Rechte, Eigentum, Rollenmatrix) und §7 (Revisionen, Konflikt), [GRID_VERGLEICH_ZIELMODELL_146.md](../dashboard/GRID_VERGLEICH_ZIELMODELL_146.md) (Zielmodell), [SPEICHERSTRUKTUR_REVISIONEN_P07.md](../dashboard/SPEICHERSTRUKTUR_REVISIONEN_P07.md), [VORLAGEN_AUSWAHL_P09B.md](../dashboard/VORLAGEN_AUSWAHL_P09B.md) (Auswahl, Obergrenzen, Duplizieren).
**Vorgelagert:** 161 (P10b-2, PR #196, gemergt als `6dbbc593`). P11 hängt fachlich nicht von P10 ab (Masterplan §6, O1).
**Baseline:** `main` nach Merge von PR #198 (Migration 20261121) und PR #199 (161-Nachtrag). Der Builder nennt den Commit im BUILD_LOG.
**Branch:** `auftrag-162-team-freigaben-server`.
**Builder:** Antigravity (oder ein anderer von Marc benannter Agent). **Prüfer:** Codex auf GitHub oder ein anderer Agent, der nicht gebaut hat (`CLAUDE.md` §4.1). **Merge und Hosted-Deployment der Migration:** Marc.
**Status:** IMPLEMENTIERT – BEREIT FÜR CODEX-REVIEW.

---

## 0. Plananpassung (Teil dieses Auftrags)

P11 wird wie P10 geteilt:

- **162 = P11a (dieser Auftrag):** Server und Dienste. Keine sichtbare Änderung in der App.
- **163 = P11b:** Oberfläche – Teamverwaltung im Admin-Bereich, Team-Dashboards in der Dashboard-Auswahl, „Mit Team teilen“/„Als persönliche Kopie“, Leseansicht für Viewer, Konfliktdialog für Team-Dashboards, Hinweis bei Rechteentzug.

Anlass: Das Rechtemodell ist sicherheitskritisch und soll für sich prüfbar sein, bevor eine Oberfläche darauf aufsetzt. Der Builder trägt die Teilung datiert in Masterplan §6 ein (T11).

## 1. Ist-Stand (geprüft auf `main` `6dbbc593` plus PR #198)

| Baustein         | Ist                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Fundstelle                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Tabellen         | `dashboard_teams` (Org, Name 1–100, eindeutig je Org), `dashboard_team_members` (Team, User, Org, `role` `member`/`lead`), `dashboards` (`scope` `personal`/`team`, `chk_dashboard_scope_owner`), `dashboard_revisions`. `team_id` mit `ON DELETE CASCADE`.                                                                                                                                                                                                                           | `20261113_dashboard_v2_storage_and_revisions.sql:6–60`                   |
| RLS              | RLS auf allen vier Tabellen aktiv. `SELECT` an `authenticated` gewährt, Schreibrechte entzogen. Policies **nur** für persönliche Dashboards/Revisionen; für Teams und Mitglieder **keine** Policy → für Clients unsichtbar.                                                                                                                                                                                                                                                           | ebd. `:83–127`                                                           |
| Sperre           | `create_dashboard_v2`, `save_dashboard_v2`, `restore_dashboard_revision_v2` werfen bei `scope = 'team'` `LP_TEAM_DASHBOARDS_LOCKED_UNTIL_P11`.                                                                                                                                                                                                                                                                                                                                        | ebd. `:363`, `:474`, `:564`; `create_dashboard_v2` zuletzt in `20261118` |
| Revisionen lesen | `get_dashboard_v2_revisions` lässt seit Migration `20261121_dashboard_revisions_scope_guard.sql` (PR #198) bis P11 nur eigene persönliche Dashboards zu. Die frühere Lücke (`d.scope = 'team' OR …` gab Team-Revisionen an jedes Org-Mitglied) ist damit geschlossen. In `save_dashboard_v2` steht dieselbe Bedingung noch im `UPDATE` (`:497`), ist aber nicht erreichbar, weil die Funktion bei `scope = 'team'` vorher abbricht. Mit Aufhebung der Sperre muss sie ersetzt werden. | `20261121_dashboard_revisions_scope_guard.sql`; `20261113:497`           |
| Persönliche RPCs | `list_personal_dashboards_v2`, `delete_personal_dashboard_v2`, `duplicate_personal_dashboard_v2`, Obergrenze 20 persönliche Dashboards je Nutzer.                                                                                                                                                                                                                                                                                                                                     | `20261118_dashboard_selection.sql`                                       |
| Konflikt         | Optimistisches Locking über `p_expected_revision`, Fehler `LP_DASHBOARD_CONFLICT` → Client `kind: 'konflikt'`; Dialog `DashboardConflictDialogV2.tsx` vorhanden.                                                                                                                                                                                                                                                                                                                      | `20261113:482`, `services/dashboardStorageV2Types.ts:84`                 |
| Org-Rollen       | `organization_members.role` `admin`/`manager`/`viewer`, `status` `active`/`suspended`, genau eine Org je Nutzer. Helfer `current_organization_id()`, `has_org_role(text[])`, `is_active_member()`.                                                                                                                                                                                                                                                                                    | `supabase/schema.sql:14–106`                                             |
| Audit            | `public.audit_log (organization_id, actor_id, action, target_type, target_id, details)`, append-only.                                                                                                                                                                                                                                                                                                                                                                                 | z. B. `20261111_lead_qualification.sql:304`                              |
| Dienste (TS)     | `dashboardStorageV2.ts` (378 Zeilen), `dashboardSelectionV2.ts` (279), `dashboardRevisionServiceV2.ts` (116), `dashboardStorageV2Types.ts` (166), In-Memory-Ersatz `dashboardInMemoryStoreV2.ts`.                                                                                                                                                                                                                                                                                     | `src/features/dashboard/services/`                                       |
| Stand 161        | Gemergt, aber nur teilweise umgesetzt (Fadenkreuz-Kopplung, E2E/Screenshots, Fach-Doku offen). Nachgetragener BUILD_LOG-Eintrag vom 17.11.2026 (PR #199). Für 162 ohne Belang, da P11 nicht von P10 abhängt.                                                                                                                                                                                                                                                                          | `docs/BUILD_LOG.md`                                                      |

Der Builder prüft diese Tabelle in T0 gegen die Baseline und meldet Abweichungen im BUILD_LOG.

## 2. Soll

### 2.1 Fachregeln (verbindlich, gehören in die Spezifikation `docs/dashboard/TEAM_FREIGABEN_P11.md`)

1. **Organisation ist der einzige Datenmandant.** Teams sind reine Freigabegruppen innerhalb genau einer Organisation. Sie filtern keine CRM-Daten und ändern keinen Datenbereich (B1). Ein Team-Dashboard zeigt dieselben Organisationsdaten wie ein persönliches.
2. **Aktive Teammitgliedschaft** eines Nutzers in Team T liegt genau dann vor, wenn alle drei gelten: Zeile in `dashboard_team_members` für (T, Nutzer); der Nutzer ist in `organization_members` **aktiv** in derselben Organisation wie T; die Organisation ist aktiv. Gesperrte Org-Mitglieder (`suspended`) haben keine aktive Teammitgliedschaft, auch wenn die Zeile noch existiert.
3. **Rechte werden bei jedem Aufruf neu bestimmt**, nie zwischengespeichert:

   | Aktion an Team-Dashboard von Team T           | `admin` der Org |               `manager`                |                `viewer`                |
   | --------------------------------------------- | :-------------: | :------------------------------------: | :------------------------------------: |
   | Lesen (Liste, Laden, Revisionen)              |  ✅ alle Teams  | ✅ nur bei aktiver Mitgliedschaft in T | ✅ nur bei aktiver Mitgliedschaft in T |
   | Anlegen, Speichern, Wiederherstellen, Löschen |  ✅ alle Teams  | ✅ nur bei aktiver Mitgliedschaft in T |                   ❌                   |
   | In persönliches Dashboard kopieren            |       ✅        |            ✅ bei Leserecht            |            ✅ bei Leserecht            |
   | Teams und Mitglieder verwalten                |       ✅        |                   ❌                   |                   ❌                   |

   Die Team-Rolle `lead` verleiht in P11 **keine** Zusatzrechte. Rechte folgen allein aus Org-Rolle und aktiver Mitgliedschaft. Der Builder dokumentiert das als bewusste Grenze.

4. **Eigentum:** Team-Dashboards gehören der Organisation (`user_id IS NULL`, `team_id` gesetzt). `created_by_user_id` ist nur Audit-Autor und begründet keine Rechte. Verlässt der Ersteller das Team oder die Organisation oder verliert er die Rolle, bleibt das Dashboard unverändert erhalten und für weiter berechtigte Mitglieder nutzbar.
5. **Rechteentzug wirkt sofort:** Der nächste Aufruf nach Entfernen aus dem Team, Rollenwechsel `manager → viewer` oder Sperrung scheitert. Ein Speichern mit gültiger `expected_revision`, aber ohne Schreibrecht, liefert `LP_TEAM_ACCESS_REVOKED` (`42501`) und ändert nichts.
6. **Team löschen zerstört nichts still:** Wegen `ON DELETE CASCADE` würde das Löschen eines Teams alle Team-Dashboards samt Revisionen mitlöschen. Deshalb verweigert `delete_dashboard_team` das Löschen, solange das Team Dashboards hat (`LP_TEAM_HAS_DASHBOARDS`). Erst löschen oder als persönliche Kopie sichern, dann Team löschen.
7. **Kopieren statt Verschieben:** Ein persönliches Dashboard wird nie in ein Team-Dashboard „umgewandelt“. „Mit Team teilen“ legt eine **Kopie** im Team an, das Original bleibt persönlich. Umgekehrt legt „Als persönliche Kopie“ ein persönliches Dashboard an. Kopien starten bei Revision 1 und übernehmen keine Revisionshistorie.
8. **Konfiguration und Zeile stimmen überein:** Bei Anlegen, Speichern, Kopieren und Wiederherstellen setzt der Server in `config` die Felder `id`, `scope` und `teamId` aus der Zeile (wie heute schon `id`). Ein Client kann darüber weder Scope noch Team wechseln. Für Team-Dashboards ist `ownerUserId` rein dokumentarisch; der Builder prüft in T0, wie es heute befüllt wird, und legt die Regel in der Spezifikation fest (Vorschlag: `created_by_user_id` der Zeile, serverseitig gesetzt).
9. **Obergrenzen:** höchstens 50 Teams je Organisation, 200 Mitglieder je Team, 50 Dashboards je Team. Persönliche Grenze 20 gilt unverändert, auch für „Als persönliche Kopie“. Überschreitung: `LP_TEAM_LIMIT`, `LP_TEAM_MEMBER_LIMIT`, `LP_TEAM_DASHBOARD_LIMIT` bzw. der vorhandene Fehler der persönlichen Grenze.
10. **Unsichtbar statt verboten:** Ein Dashboard, für das kein Leserecht besteht (fremde Org, fremdes Team, persönliches eines anderen Nutzers), liefert überall `LP_DASHBOARD_NOT_FOUND` – nicht „verboten“. So lässt sich die Existenz fremder Dashboards nicht abfragen.
11. **Audit:** Jede Änderung an Teams, Mitgliedschaften und Team-Dashboards schreibt eine `audit_log`-Zeile (Aktionen in 2.3). Der Builder prüft in T0, ob `audit_log.action` eine Prüfliste hat, und ergänzt sie nur, falls nötig (dann in derselben Migration, im BUILD_LOG begründet).

### 2.2 Migration `supabase/migrations/20261122_dashboard_team_sharing.sql`

12. **Hilfsfunktionen** (`SECURITY DEFINER`, `STABLE`, `SET search_path = public, pg_temp`, `REVOKE` von `PUBLIC`/`anon`, `GRANT EXECUTE` an `authenticated`):
    - `dashboard_team_is_active_member(p_team_id UUID) RETURNS BOOLEAN` – Regel 2.1 Nr. 2 für `auth.uid()`.
    - `dashboard_team_can_read(p_team_id UUID) RETURNS BOOLEAN` – Team gehört zu `current_organization_id()` und (Org-Admin oder aktive Mitgliedschaft).
    - `dashboard_team_can_write(p_team_id UUID) RETURNS BOOLEAN` – Team gehört zu `current_organization_id()` und (Org-Admin oder (Org-`manager` und aktive Mitgliedschaft)).
13. **RLS-Policies** (zusätzlich zu den bestehenden, die unverändert bleiben):
    - `dashboards`: `SELECT` bei `scope = 'team' AND organization_id = current_organization_id() AND dashboard_team_can_read(team_id)`.
    - `dashboard_revisions`: `SELECT` für Revisionen von Team-Dashboards mit Leserecht.
    - `dashboard_teams`: `SELECT` für Org-Admins (alle Teams der Org) und für aktive Mitglieder (eigene Teams).
    - `dashboard_team_members`: `SELECT` für Org-Admins (alle Zeilen der Org) und für die eigene Zeile.
    - Schreibrechte bleiben für `authenticated` entzogen; Schreiben nur über RPCs.
14. **Bestehende RPCs ersetzen** (`CREATE OR REPLACE`, Grundlage jeweils die letzte Fassung; persönliche Pfade **verhaltensgleich**, durch bestehende Tests belegt):
    - `create_dashboard_v2`: Sperre `LP_TEAM_DASHBOARDS_LOCKED_UNTIL_P11` entfällt. `scope = 'team'` verlangt `p_team_id` und `dashboard_team_can_write`. Fehler: `LP_TEAM_NOT_FOUND`, wenn das Team fehlt, zu einer anderen Org gehört oder nicht lesbar ist (Regel 2.1 Nr. 10); `LP_TEAM_ACCESS_REVOKED`, wenn das Team lesbar, aber nicht beschreibbar ist (Viewer-Mitglied). Grenze 50 je Team.
    - `save_dashboard_v2`: Bedingung `d.scope = 'team' OR d.user_id = v_user` wird ersetzt durch „persönlich und eigener Nutzer“ **oder** „Team und `dashboard_team_can_write(team_id)`“. Reihenfolge der Prüfungen: Existenz/Leserecht (sonst `LP_DASHBOARD_NOT_FOUND`) → Schreibrecht (sonst `LP_TEAM_ACCESS_REVOKED`) → Revision (sonst `LP_DASHBOARD_CONFLICT`). Damit sieht ein entzogener Nutzer nie einen „Konflikt“ statt „Rechte entzogen“.
    - `restore_dashboard_revision_v2`: gleiche Rechte wie Speichern.
    - `get_dashboard_v2_revisions`: Leserecht nach Regel 2.1 Nr. 3 statt „nur eigene persönliche“ (Fassung aus 20261121).
15. **Neue RPCs** (alle `SECURITY DEFINER`, `SET search_path = public, pg_temp`, `#variable_conflict use_variable`, `LP_AUTH_REQUIRED` ohne Nutzer/Org, `REVOKE ALL` von `PUBLIC`/`anon`, `GRANT EXECUTE` an `authenticated`):

    | RPC                                                                                             | Recht                                                                                                        | Ergebnis / Fehler                                                                                                                                                                                   |
    | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `list_dashboard_teams_v2()`                                                                     | angemeldet                                                                                                   | Teams mit Leserecht: `id, name, description, member_count, dashboard_count, can_write, is_member`; sortiert nach Name.                                                                              |
    | `create_dashboard_team_v2(p_name TEXT, p_description TEXT)`                                     | Admin                                                                                                        | Name getrimmt 1–100, eindeutig je Org (`LP_TEAM_NAME_TAKEN`), Grenze 50 (`LP_TEAM_LIMIT`). Audit `dashboard.team.created`.                                                                          |
    | `update_dashboard_team_v2(p_team_id UUID, p_name TEXT, p_description TEXT)`                     | Admin                                                                                                        | wie oben; Audit `dashboard.team.updated`.                                                                                                                                                           |
    | `delete_dashboard_team_v2(p_team_id UUID)`                                                      | Admin                                                                                                        | `LP_TEAM_HAS_DASHBOARDS`, wenn Dashboards vorhanden. Audit `dashboard.team.deleted`.                                                                                                                |
    | `list_dashboard_team_members_v2(p_team_id UUID)`                                                | Admin                                                                                                        | `user_id, email, org_role, org_status, team_role, created_at`. E-Mail nur aus der eigenen Org, wie in der vorhandenen Mitgliederverwaltung.                                                         |
    | `add_dashboard_team_member_v2(p_team_id UUID, p_user_id UUID)`                                  | Admin                                                                                                        | Nutzer muss aktives Mitglied derselben Org sein (`LP_MEMBER_NOT_IN_ORG`), idempotent, Grenze 200. Audit `dashboard.team.member_added`.                                                              |
    | `remove_dashboard_team_member_v2(p_team_id UUID, p_user_id UUID)`                               | Admin                                                                                                        | Entfernt die Zeile; idempotent. Dashboards des Teams bleiben. Audit `dashboard.team.member_removed`.                                                                                                |
    | `list_accessible_dashboards_v2()`                                                               | angemeldet                                                                                                   | Eigene persönliche **und** lesbare Team-Dashboards: Spalten von `list_personal_dashboards_v2` plus `team_id, team_name, can_write`. `list_personal_dashboards_v2` bleibt unverändert.               |
    | `load_dashboard_v2(p_dashboard_id UUID)`                                                        | Leserecht                                                                                                    | `id, title, scope, team_id, revision, config, updated_at, can_write`; sonst `LP_DASHBOARD_NOT_FOUND`.                                                                                               |
    | `delete_team_dashboard_v2(p_dashboard_id UUID, p_expected_revision INTEGER)`                    | Schreibrecht                                                                                                 | Reihenfolge wie Speichern; Revisionen werden mitgelöscht (wie persönlich). Audit `dashboard.team_dashboard.deleted`.                                                                                |
    | `copy_dashboard_v2(p_source_id UUID, p_target_scope TEXT, p_target_team_id UUID, p_title TEXT)` | Leserecht an Quelle; Ziel `personal` immer erlaubt (Grenze 20), Ziel `team` nur mit Schreibrecht am Zielteam | Neue Zeile, Revision 1, eine Revision mit `change_summary` „Kopie von <Quelltitel>“. Titelregel wie `duplicate_personal_dashboard_v2` (1–80 Zeichen). Audit `dashboard.copied` mit Quelle und Ziel. |

16. **Nicht geändert:** `load_personal_dashboard_v2`, `get_or_create_personal_dashboard_v2`, `list_personal_dashboards_v2`, `delete_personal_dashboard_v2`, `duplicate_personal_dashboard_v2`, `dashboard_config_v2_invalid_reason`, `dashboard_time_series`, Tabellenstruktur und Constraints. Einzige Ausnahme: eine nötige Prüfliste in `audit_log` (2.1 Nr. 11).

### 2.3 pgTAP `supabase/tests/dashboard_team_sharing.sql`

17. Setup wie `member_management.sql` (feste UUIDs, `BEGIN … ROLLBACK`, zwei Organisationen, je Admin/Manager/Viewer, ein gesperrter Manager, Teams A1/A2 in Org A, B1 in Org B). Pflichtfälle, je Fall ein eigener Test:
    - Rechtematrix 2.1 Nr. 3 vollständig: jede Zeile × jede Rolle × (Mitglied / Nicht-Mitglied).
    - Mandantentrennung: Admin aus Org B sieht, lädt, kopiert, speichert nichts aus Org A (`LP_DASHBOARD_NOT_FOUND`/`LP_TEAM_NOT_FOUND`); `add_dashboard_team_member_v2` mit Nutzer aus Org B → `LP_MEMBER_NOT_IN_ORG`.
    - Rechteentzug: Manager speichert (ok) → Admin entfernt ihn → nächstes Speichern `LP_TEAM_ACCESS_REVOKED`, Dashboard unverändert; dasselbe für Rollenwechsel `manager → viewer` und Sperrung.
    - Ersteller-Austritt: Ersteller entfernt → Dashboard existiert, anderes Mitglied speichert erfolgreich, `created_by_user_id` unverändert.
    - Reihenfolge: entzogener Nutzer mit veralteter Revision erhält `LP_TEAM_ACCESS_REVOKED`, nicht `LP_DASHBOARD_CONFLICT`.
    - Konflikt: zwei berechtigte Manager, zweiter Speichervorgang mit alter Revision → `LP_DASHBOARD_CONFLICT`.
    - Team löschen mit Dashboards → `LP_TEAM_HAS_DASHBOARDS`, ohne → ok.
    - Config-Bindung 2.1 Nr. 8: Speichern mit manipuliertem `scope`/`teamId` in `config` ändert Scope/Team der Zeile nicht und gespeicherte `config` trägt die Zeilenwerte.
    - Kopieren: persönlich → Team, Team → persönlich (auch als Viewer), Grenzen 20 und 50, Titelregel, Revision 1.
    - Obergrenzen 50/200/50.
    - RLS direkt: `SELECT` auf die vier Tabellen als jede Rolle liefert genau die erlaubten Zeilen; `INSERT`/`UPDATE`/`DELETE` als `authenticated` scheitern.
    - Revisionen: Nicht-Mitglied derselben Org erhält für Team-Dashboards weiterhin `LP_DASHBOARD_NOT_FOUND`, Mitglied (auch Viewer) und Admin erhalten die Liste. `dashboard_revisions_scope_guard.sql` (aus PR #198) erwartet bis P11 auch für den Admin „nicht gefunden“; der Builder passt dort **nur** Test 2 an das neue Soll an und begründet das im BUILD_LOG.
    - Audit: je Aktion genau eine Zeile mit richtiger `action`, `actor_id`, `organization_id`.
18. Bestehende pgTAP-Dateien (`dashboard_selection.sql`, `dashboard_sections.sql`, `dashboard_query_contract.sql`, `dashboard_query_window.sql`, `tenant_isolation.sql`, `rls_coverage.sql`, `member_management.sql`) bleiben **unverändert grün**. Ändert `rls_coverage.sql` sein Ergebnis wegen neuer Policies, wird nur ergänzt, nichts gelöscht.

### 2.4 Dienstschicht (TypeScript, ohne Oberfläche)

19. Neue Datei `services/dashboardTeamsV2.ts`: Teamverwaltung (`listDashboardTeamsV2`, `createDashboardTeamV2`, `updateDashboardTeamV2`, `deleteDashboardTeamV2`, `listDashboardTeamMembersV2`, `addDashboardTeamMemberV2`, `removeDashboardTeamMemberV2`).
20. Neue Datei `services/dashboardSharingV2.ts`: `listAccessibleDashboardsV2`, `loadDashboardV2`, `deleteTeamDashboardV2`, `copyDashboardV2`.
21. `dashboardStorageV2Types.ts`: `classifyDashboardV2Error` um `team_zugriff_entzogen`, `team_nicht_gefunden`, `team_hat_dashboards`, `team_name_vergeben`, `team_grenze`, `mitglied_nicht_in_org` erweitern. Bestehende Arten und Texte unverändert. Unbekannte `LP_*`-Codes fallen wie bisher in die allgemeine Art.
22. **Ohne Supabase (Demo-/In-Memory-Modus)** liefern alle Team-Funktionen einen klaren Fehler `nicht_verfuegbar` („Team-Freigaben brauchen eine Server-Verbindung“) statt still leerer Listen. `dashboardInMemoryStoreV2.ts` wird nicht um Teams erweitert.
23. `createDashboardV2` und `saveDashboardV2` reichen `teamId` bereits durch; der Builder prüft in T0, dass sie für Team-Dashboards ohne weitere Änderung funktionieren, und ergänzt sonst minimal. Persönlicher Pfad bytegleich.
24. Tests: `__tests__/dashboardTeamsV2.vitest.ts`, `__tests__/dashboardSharingV2.vitest.ts` (gemockter Supabase-Client: Parameter-Namen exakt wie RPC, Fehlerabbildung je `LP_*`-Code, Demo-Modus). Bestehende Service-Tests unverändert grün.
25. **Kein Import** der neuen Dienste in Komponenten. Das Initial-Bundle darf sich höchstens um 0,1 kB ändern (Tree-Shaking).

### 2.5 Dokumentation

26. **Neu** `docs/dashboard/TEAM_FREIGABEN_P11.md`: Fachregeln 2.1, Rechtematrix, RPC-Tabelle mit allen Fehlercodes, RLS-Übersicht, Kopierregel, Löschregel, bewusste Grenzen (`lead` ohne Rechte, keine Team-Datenfilter, kein Org-Standard-Dashboard `scope = 'organization'`, keine Benachrichtigung bei Rechteentzug), Vorgaben für 163.
27. `DASHBOARD_EDITOR_MASTERPLAN.md` §6: datierter Nachtrag „Plananpassung P11a/P11b“ und „Umsetzungsstand P11a“. Nichts umschreiben.
28. `EDITOR_UX_FACHVERTRAEGE_145.md` §6: datierter Nachtrag „Umgesetzt in 162“ mit Verweis auf `TEAM_FREIGABEN_P11.md` und Hinweis, dass `scope = 'organization'` weiterhin nicht umgesetzt ist.
29. `SPEICHERSTRUKTUR_REVISIONEN_P07.md`: datierter Nachtrag „Team-Scope aktiviert (20261122)“.
30. `ARCHITECTURE_DECISIONS.md` Teil C: nur ergänzen (Migration 20261122, Rechte dynamisch je Aufruf, Löschsperre für Teams mit Dashboards).
31. `BUILD_PLAN.md` „Aktueller Auftrag“ auf 162.

## 3. Verbindliche Grenzen

1. **Schutzbereiche** unverändert: `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`.
2. **Genau eine neue Migration** `20261122_dashboard_team_sharing.sql`. Bestehende Migrationen bleiben unverändert. Keine Tabellenänderung außer einer etwa nötigen `audit_log`-Prüfliste (2.1 Nr. 11).
3. **Keine Oberfläche:** keine Änderung an Komponenten, Seiten, Routen, `src/auth/permissions.ts`, E2E-Specs, Screenshots. Das gehört zu 163.
4. **Persönliche Dashboards verhaltensgleich:** alle bestehenden Unit-, pgTAP- und E2E-Tests für persönliche Dashboards bleiben unverändert grün.
5. **Keine Team-Datenfilter:** Kein RPC liest CRM-Tabellen anders als bisher; `dashboard_time_series` und alle CRM-/Live-Resolver bleiben unverändert.
6. **V1-Pfad unverändert** (V1-Editor, `PersonalExecutiveDashboard.tsx`, `DashboardTileDetailPage.tsx`, `dashboardPresets.ts`, `dashboardRollout.ts`).
7. **Keine neuen Abhängigkeiten.**
8. **`max-lines` 400** für alle neuen und geänderten TS-Dateien.
9. **Tests zuerst**, Rot-Läufe im BUILD_LOG: (a) pgTAP Team-Mitglied liest Team-Revisionen → heute `LP_DASHBOARD_NOT_FOUND` (rot gegen Soll); (b) pgTAP Manager legt Team-Dashboard an → heute `LP_TEAM_DASHBOARDS_LOCKED_UNTIL_P11` (rot gegen Soll); (c) pgTAP Rechteentzug → Speichern scheitert (rot, weil RPC fehlt bzw. Sperre greift); (d) Vitest Fehlerabbildung `LP_TEAM_ACCESS_REVOKED` rot.
10. **Keine Secrets**, keine Hosted-Änderung durch den Builder. Die Migration auf Hosted wendet Marc an.

## 4. Ziel-Dateien

| Pfad                                                                                                                                                                                                       | Änderung                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_162_TEAM_FREIGABEN_SERVER.md`                                                                                                                                          | Dieser Auftrag (Checkboxen, Status)                     |
| `supabase/migrations/20261122_dashboard_team_sharing.sql` (neu)                                                                                                                                            | Hilfsfunktionen, Policies, ersetzte und neue RPCs (2.2) |
| `supabase/tests/dashboard_team_sharing.sql` (neu), `supabase/tests/rls_coverage.sql` (nur ergänzen, falls nötig), `supabase/tests/dashboard_revisions_scope_guard.sql` (nur Test 2 an neues Soll anpassen) | pgTAP (2.3)                                             |
| `src/features/dashboard/services/dashboardTeamsV2.ts` (neu), `dashboardSharingV2.ts` (neu), `dashboardStorageV2Types.ts`, ggf. `dashboardStorageV2.ts` (nur 2.4 Nr. 23)                                    | Dienstschicht (2.4)                                     |
| `src/features/dashboard/__tests__/dashboardTeamsV2.vitest.ts` (neu), `dashboardSharingV2.vitest.ts` (neu)                                                                                                  | Tests                                                   |
| `docs/dashboard/TEAM_FREIGABEN_P11.md` (neu), `DASHBOARD_EDITOR_MASTERPLAN.md`, `EDITOR_UX_FACHVERTRAEGE_145.md`, `SPEICHERSTRUKTUR_REVISIONEN_P07.md`, `ARCHITECTURE_DECISIONS.md`                        | Spezifikation und datierte Nachträge (2.5)              |
| `BUILD_PLAN.md`, `docs/BUILD_LOG.md`                                                                                                                                                                       | Status, Builder-Eintrag, Prüfnachweis                   |

Bei Bedarf außerhalb dieser Liste: stoppen und im PR begründen (`CLAUDE.md` §5.3).

## 5. Tasks

Reihenfolge je Block: Tests zuerst, dann Umsetzung.

- [x] **T0 Einstieg:** Baseline festlegen, Ist-Tabelle §1 prüfen, `ownerUserId`-Befüllung und `audit_log`-Prüfliste klären (2.1 Nr. 8, 11), lokale Supabase starten (`supabase start`, `supabase db reset`).
- [x] **T1 Rot-Nachweise:** §3 Nr. 9 (a)–(d), Ergebnisse im BUILD_LOG.
- [x] **T2 Hilfsfunktionen und RLS:** 2.2 Nr. 12–13, RLS-Fälle aus 2.3 grün.
- [x] **T3 Bestehende RPCs ersetzen:** 2.2 Nr. 14; persönliche pgTAP-Dateien unverändert grün (Nachweis).
- [x] **T4 Teamverwaltung:** RPCs Teams/Mitglieder, Grenzen, Audit.
- [x] **T5 Team-Dashboards:** Liste, Laden, Löschen, Kopieren, Config-Bindung.
- [x] **T6 Rechteentzug und Austritt:** alle Fälle aus 2.3, Reihenfolge Rechte vor Konflikt.
- [x] **T7 Dienstschicht:** 2.4, Vitest grün, Demo-Modus.
- [x] **T8 Bundle-Gegenprobe:** `size-limit` vorher/nachher (≤ 0,1 kB Änderung).
- [x] **T9 Gegenprobe persönlich und V1:** bestehende E2E `editor-*.spec.ts` und V1-Tests grün, V1-Diff leer.
- [x] **T10 Sicherheitsvorprüfung:** Builder geht die RPC-Tabelle Zeile für Zeile durch (Rechteprüfung vor jeder Wirkung, `search_path` gesetzt, keine dynamische SQL, keine Rückgabe fremder E-Mails) und legt die Liste im BUILD_LOG ab. Optional lokal `/security-review` oder Plugin `codex-review`; ersetzt nicht das unabhängige Review.
- [x] **T11 Doku:** 2.5 einschließlich Plananpassung §0.
- [x] **T12 Abschluss:** Pflicht-Verifikation (§7), Schutzbereichs-Diff, BUILD_LOG-Eintrag inklusive Deployment-Anleitung für Marc (Migration 20261122 auf Hosted anwenden; Smoke als `authenticated`: Admin legt Team an, fügt Manager hinzu, Manager legt Team-Dashboard an und speichert, Viewer-Mitglied lädt es und erhält beim Speichern `LP_TEAM_ACCESS_REVOKED`), PR öffnen, Review anfordern.

## 6. Abnahme

- Zwei berechtigte Nutzer derselben Organisation teilen ein Team-Dashboard: beide sehen es, der Manager speichert, das Viewer-Mitglied liest nur.
- Fremde Organisationen und Nicht-Mitglieder sehen weder Teams noch Team-Dashboards noch deren Revisionen; Fehler ist „nicht gefunden“.
- Entfernen aus dem Team, Rollenwechsel und Sperrung wirken beim nächsten Aufruf; ein entzogener Nutzer erhält „Rechte entzogen“, nie „Konflikt“.
- Ersteller-Austritt zerstört kein Team-Dashboard; Team-Löschung mit Dashboards wird verweigert.
- Kopieren in beide Richtungen funktioniert mit Grenzen und Titelregel; Scope und Team lassen sich über `config` nicht manipulieren.
- Die unerreichbare Bedingung `d.scope = 'team' OR …` in `save_dashboard_v2` ist durch die Rechteprüfung ersetzt; Revisionen sind genau für Leseberechtigte sichtbar.
- Persönliche Dashboards und V1 verhalten sich unverändert; Schutzbereichs-Diff leer; keine neuen Abhängigkeiten; Bundle praktisch unverändert.

## 7. Pflicht-Verifikation

```
npx tsc --noEmit
npm run lint
npm run format:check
npm test
npm run verify
npm run build
npm run build:production      # mit gültiger Beispielkonfiguration
npm run size-limit
supabase test db              # lokal, inkl. dashboard_team_sharing.sql und aller bestehenden dashboard_*.sql
npx tsx scripts/verifyLiveKpiCatalog.ts
git diff <baseline> -- src/simulation src/types src/context src/services/data src/features/resources   # leer
git diff <baseline> -- src/features/dashboard/components src/features/dashboard/pages src/features/admin src/app src/auth e2e   # leer
git diff <baseline> -- src/services/liveKpi supabase/functions src/services/db/crmRepository.ts src/domain src/features/dashboard/data   # leer
git diff --stat <baseline> -- supabase/migrations   # nur 20261122_dashboard_team_sharing.sql neu
```

Zusätzlich lokal Playwright `e2e/editor-*.spec.ts` als Gegenprobe; CI-Checks `lint`, `typecheck`, `test`, `build`, `livekpi-verifiers`, `size-limit`, `e2e` grün.

## 8. Offene Punkte und Risiken

- **Sicherheitskritisch:** Fehler in Hilfsfunktionen oder Policies öffnen Dashboards für Unberechtigte. Deshalb Rechtematrix vollständig in pgTAP.
- **Deployment-Reihenfolge:** Migration 20261122 kann vor der App aus 163 live gehen; ohne Oberfläche ändert sich für Nutzer nichts. Rückweg: Migration ist rein additiv bzw. ersetzt Funktionen; zum Zurückdrehen genügt das erneute Einspielen der vorherigen Funktionsfassungen (Builder legt die Liste der betroffenen Funktionen mit Herkunftsmigration im BUILD_LOG ab).
- **Offene Entscheidung für Marc (nicht blockierend):** Ob die Team-Rolle `lead` künftig Rechte bekommt (z. B. Mitglieder verwalten ohne Admin). Bis dahin ohne Wirkung.
- **Restpunkte 161** (Fadenkreuz-Kopplung, E2E/Screenshots, Fach-Doku) sind nicht Teil dieses Auftrags.
- **Nicht Teil dieses Auftrags:** Oberfläche (163), Benachrichtigung bei Rechteentzug, Org-Standard-Dashboard `scope = 'organization'`, Versionsoberfläche und Import/Export (P12), Alarm-Lebenszyklus nach Ersteller-Austritt (P13).
