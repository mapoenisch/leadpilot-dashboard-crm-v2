# Auftrag 167 – Dashboard-Editor: Server-Alarme mit pg_cron, Paritätsnachweis, Lebenszeichen, Revisions-Aufbewahrung (P13b)

**Ziel:** Schwellenwerte auf Kacheln werden auf Wunsch zu echten Alarmen, die **auf dem Server** alle 5 Minuten geprüft werden, auch wenn kein Browser offen ist. Gebaut werden Regeltabelle, Auswertungszustand, Ereignisprotokoll, der `pg_cron`-Job nach Marcs Entscheidung vom 18.11.2026 (Auftrag 166 §8), ein prüfbares Lebenszeichen und ein Not-Aus. Eine Kennzahl wird erst „alarmfähig“, wenn ein Paritätstest belegt, dass Server und App denselben Wert, dieselbe Einheit und denselben Leer-/Fehlerzustand liefern. Derselbe Zeitplan räumt einmal täglich alte Dashboard-Versionen nach der Regel aus Auftrag 165 §8 auf. **Dieser Auftrag baut keine Oberfläche für Alarme**; die kommt mit 168.

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P13 (§6), §4.D, §4.E (Rechtemodell, Eigentum), §8 (Abschalten), §9.2, Gegenprüfung L2/L3/L4 (§9.3).
**Fachgrundlage:** [SCHWELLENWERTE_P13A.md](../dashboard/SCHWELLENWERTE_P13A.md), Auftrag 166 §2.1 (Regelarten, Stufen) und §8 (Entscheidung Betriebsweg), Auftrag 165 §8 (Aufbewahrung der Revisionen), [KPI_FAEHIGKEITEN_144.md](../dashboard/KPI_FAEHIGKEITEN_144.md).
**Vorgelagert:** 166 (P13a, PR #205) ist gemergt (`c138ce2e`).
**Baseline:** aktueller `main` (mindestens `c138ce2e`; der Builder nennt den Commit im BUILD_LOG).
**Branch:** `auftrag-167-server-alarme`.
**Builder:** Antigravity (oder ein anderer von Marc benannter Agent). **Prüfer:** Codex auf GitHub oder ein anderer Agent, der nicht gebaut hat (`CLAUDE.md` §4.1). **Merge und Deploy (inkl. Hosted-Migration und Aktivieren von `pg_cron`):** Marc.
**Status:** BEREIT.

---

## 0. Einordnung

| Teil | Auftrag | Inhalt                                                                                                                                                                 | Server   |
| ---- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| P13a | 166 ✅  | Regelmodell, Kachelanzeige, Alarmfähigkeitsmatrix, Betriebsweg entschieden                                                                                             | nein     |
| P13b | **167** | Tabellen, Auswertungsfunktion, `pg_cron`, Lebenszeichen, Not-Aus, Paritätstests, Freischalten alarmfähiger KPIs, Regel-RPCs, Pausieren bei Rechteverlust, Aufbewahrung | ja       |
| P13c | 168     | Alarmliste und Alarm-Einstellungen in der App, Lesebestätigung/Quittierung, Admin-Übernahme pausierter Regeln, Ausfallhinweis, Hinweis „ältere Versionen entfernt“     | nur RPCs |

## 1. Ist-Stand (geprüft auf `main` = `c138ce2e`)

| Baustein                | Ist                                                                                                                                                                                                                                                                                                                                                                                                                 | Fundstelle                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Regelmodell             | `ThresholdRuleV2` (drei Arten, `einheit`, Grenzen), `evaluateThresholdV2`, Altregel-Übersetzung; Regel liegt in `dashboards.config → tiles[].threshold`.                                                                                                                                                                                                                                                            | `src/features/dashboard/model/thresholdRuleV2.ts` (400 Zeilen, an der Grenze)                         |
| Referenzfälle           | 57 Fälle; Zustände `ok`, `fehler`, `offline`, `veraltet`; Stufen `normal`, `warnung`, `kritisch`, `keine_daten`, `nicht_bewertet`, `regel_ungueltig`.                                                                                                                                                                                                                                                               | `model/thresholdReferenceCases.json`                                                                  |
| Alarmfähigkeitsmatrix   | 62 aktive IDs: 16 `pruefbar` (4 CRM über `dashboard_crm_pipeline_overview`: `crm.pipeline_deals`, `_volumen`, `_gewonnen`, `_offen`; 12 Live über `live_kpi_events`: `live.arr`, `.mrr`, `.pipeline_coverage`, `.arr_direct`, `.arr_partner`, `.arr_outbound`, `.arr_other`, `.pipeline_leads`, `.pipeline_mql`, `.pipeline_sql`, `.pipeline_offers`, `.pipeline_won`), 13 `ausgeschlossen`, 33 `nicht_einzelwert`. | `model/catalog/alarmEntries.ts`, `scripts/verifyAlarmCapability.ts`                                   |
| CRM-Wert auf dem Server | `dashboard_crm_pipeline_overview(p_pipeline)` ist `SECURITY INVOKER` und ermittelt die Organisation über `current_organization_id()` – vom Cron-Job ohne Nutzer **nicht** aufrufbar.                                                                                                                                                                                                                                | `supabase/migrations/20261116_dashboard_query_contract.sql:290`                                       |
| Live-Wert im Client     | Neuester Eintrag je KPI aus `live_kpi_public_feed` (RLS je Organisation); nicht endlicher Wert → `fehler`; kein Eintrag → `keine_daten`; `quality_status = 'degraded'` → Wert gilt, Hinweis „degradiert“. „Veraltet“ hängt im Client an der **Stream-Verbindung**, nicht am Alter der Daten.                                                                                                                        | `src/services/liveKpi/liveKpiReadAdapter.ts:94`, `src/features/dashboard/data/resolveLive.ts:230–330` |
| Paritäts-Vorbild        | Gemeinsame JSON-Fixtures unter `supabase/tests/fixtures/dashboard_query_parity/`, Vitest liest sie.                                                                                                                                                                                                                                                                                                                 | `src/features/dashboard/__tests__/dashboardQueryParity.vitest.ts`                                     |
| Dashboards/Rechte       | `dashboards` (`organization_id`, `scope` personal/team, `user_id`, `team_id`, `created_by_user_id`, `config`), `dashboard_revisions`; Rollenprüfung über `has_org_role(...)`, Team-Rechte aus 162.                                                                                                                                                                                                                  | `20261113_dashboard_v2_storage_and_revisions.sql`, `20261122_dashboard_team_sharing.sql`              |
| Audit-Log               | `audit_log (organization_id, actor_id, action, target_type, target_id, details)`.                                                                                                                                                                                                                                                                                                                                   | `20260929_audit_log.sql`                                                                              |
| Wiederherstellung       | `restoreDashboardV2Revision` schreibt `change_summary = 'Wiederherstellung von Revision N'`; eine eigene Spalte für die Quelle gibt es nicht.                                                                                                                                                                                                                                                                       | `services/dashboardRevisionServiceV2.ts:276`                                                          |
| Scheduler               | Kein `pg_cron`, keine Cron-Jobs im Repo. CI startet lokales Supabase, führt `supabase test db` (pgTAP) und `npm run verify:migrations` aus.                                                                                                                                                                                                                                                                         | `.github/workflows/ci.yml:180–210`                                                                    |
| Letzte Migration        | `20261123_dashboard_revision_detail.sql`                                                                                                                                                                                                                                                                                                                                                                            | `supabase/migrations/`                                                                                |

**Doku-Fehler aus 166 (in T1 zu korrigieren):**

- `docs/dashboard/SCHWELLENWERTE_P13A.md` §6 beschreibt einen „Out-of-Process Worker“ und nennt `pg_cron` „verworfen“. Das widerspricht Marcs Entscheidung in Auftrag 166 §8 (`pg_cron`, 5 Minuten, Manager/Admin). Gleiches gilt für Masterplan §9.2 (Zeile „Ausführung des Alarm-Workers …“), `ARCHITECTURE_DECISIONS.md` D4 (Änderungsprotokoll, Zeile 2026-11-18 „Betriebsweg Out-of-Process Worker“) und den Builder-Eintrag 166 in `docs/BUILD_LOG.md` („Beschluss: Out-of-Process Worker“).
- `SCHWELLENWERTE_P13A.md` §5 nennt `baseline.arr`, `baseline.ebitda`, `baseline.umsatz` als Beispiele für `pruefbar`. Im Code sind alle `baseline.*` korrekt `ausgeschlossen`; nur die Beispiele sind falsch.

Der Builder prüft diese Tabelle in T0 gegen die Baseline und meldet Abweichungen im BUILD_LOG.

## 2. Soll

### 2.1 Fachregeln (verbindlich)

1. **Eine Quelle für den Schwellenwert.** Eine Alarmregel verweist auf **eine Kachel** (`dashboard_id`, `tile_id`). Grenzen und Art liest der Server bei jeder Auswertung aus der **aktuell gespeicherten** Dashboard-Konfiguration (`tiles[].threshold`). Wer den Schwellenwert im Editor ändert und speichert, ändert damit den Alarm. Es gibt keine zweite Kopie der Grenzen.
2. **Alarm nur bei alarmfähiger Kennzahl.** Eine Regel lässt sich nur anlegen, wenn die Kennzahl der Kachel in der Matrix den neuen Status `alarmfaehig` hat (2.3 Nr. 17) und die Kachelabfrage nur unterstützte Filter nutzt (CRM: höchstens `pipeline`; Live: keine). Sonst lehnt der Server mit deutschem Grund ab.
3. **Bewertung wie in der App.** Die Stufe ergibt sich exakt nach Auftrag 166 §2.1 Nr. 1–5 (Grenzwert gehört zur schlechteren Stufe, Zielbereich, `keine_daten`, `nicht_bewertet`, `regel_ungueltig`). Der Server rechnet mit `NUMERIC`, nicht mit Gleitkomma-Näherungen, und muss **alle** Fälle aus `thresholdReferenceCases.json` bestehen.
4. **Wert wie in der App.**
   - CRM: dieselbe Rechnung wie `dashboard_crm_pipeline_overview` für die Organisation der Regel und den gespeicherten `pipeline`-Filter (2.2 Nr. 9).
   - Live: neuester Eintrag je `(organization_id, kpi_id)` nach `occurred_at DESC, ingested_at DESC` aus derselben Quelle, die die App liest (`live_kpi_public_feed`). Nicht endlicher Wert → `fehler`, kein Eintrag → `keine_daten`, `degraded` → Wert gilt.
   - Einheit aus dem Katalog; weicht sie von `threshold.einheit` ab → `regel_ungueltig`.
   - **Kein Datenalter-Kriterium in 167:** Die App kennt „veraltet“ nur bei getrennter Verbindung. Der Server bewertet deshalb jeden vorhandenen Wert und speichert dessen Zeitstempel (`datenstand`) im Zustand und in jedem Ereignis. Ob ein Wert ab einem bestimmten Alter „veraltet“ heißen soll, entscheidet Marc später (§9); bis dahin wird kein Alter erfunden.
5. **Zustände einer Regel.** Bewertete Stufe (`normal`, `warnung`, `kritisch`, `keine_daten`, `nicht_bewertet`, `regel_ungueltig`) plus Betriebszustände `pausiert` und `auswertungsfehler` (Ausnahme beim Rechnen; Fehlertext gekürzt auf 300 Zeichen, nie Stacktraces oder Daten anderer Organisationen).
6. **Mindestdauer (zeitliche Hysterese).** Je Regel `mindestdauer_minuten` (0–120, Standard 10). Eine neue Stufe wird erst **bestätigt**, wenn sie bei aufeinanderfolgenden Läufen mindestens so lange ansteht. Das gilt in beide Richtungen (auch die Rückkehr zu `normal`). Bei 0 wird sofort bestätigt. Eine wertbasierte Hysterese (Prozentabstand zur Grenze) gibt es bewusst nicht; die Begründung steht in der Fach-Doku.
7. **Ereignisse nur bei Wechsel (Deduplizierung).** Ein Ereignis entsteht nur, wenn sich die **bestätigte** Stufe ändert, oder bei Pausieren/Fortsetzen der Regel. Gleichbleibende Stufe → kein Ereignis, egal wie viele Läufe.
8. **Abklingzeit.** Je Regel `abklingzeit_minuten` (0–1440, Standard 60). Pendelt eine Regel zwischen `normal` und `warnung`, entsteht nach einem Ereignis „→ warnung“ innerhalb der Abklingzeit kein weiteres Ereignis „→ warnung“; der Zustand wird trotzdem nachgeführt. **Eskalation zu `kritisch` wird nie unterdrückt.**
9. **Neustart ohne Meldungsflut.** Der Zustand liegt in der Tabelle. Ein ausgefallener oder neu gestarteter Job erzeugt beim nächsten Lauf nur Ereignisse für echte Wechsel. Bei der **ersten** Auswertung einer neuen Regel entsteht genau ein Ereignis nur dann, wenn die bestätigte Stufe `warnung` oder `kritisch` ist.
10. **Rechte (Entscheidung Marc 18.11.2026, Masterplan §4.E).**
    - Regeln anlegen, ändern, pausieren, löschen: **Manager und Admin**, und nur für Dashboards, die sie schreiben dürfen (persönlich: eigenes; Team: Manager für zugeordnete Teams, Admin in der eigenen Organisation – wie die Schreibrechte aus 162).
    - Regeln und Ereignisse lesen: jeder, der das Dashboard lesen darf (aktuelle Rechte; Austritt oder Rechteentzug wirkt sofort auch auf alte Ereignisse).
    - Viewer verwalten keine Regeln.
11. **Pausieren bei Rechteverlust.** Vor jeder Auswertung prüft der Job, ob der **Verantwortliche** der Regel (zu Beginn der Ersteller) noch aktives Mitglied der Organisation ist, Manager oder Admin ist und das Dashboard schreiben darf. Wenn nicht: Regel wird `pausiert` mit `pause_grund = 'verantwortlicher_ohne_rechte'`, ein Ereignis „pausiert“ entsteht, die Regel wird **nicht** gelöscht und nicht ausgewertet. Übernahme durch einen Admin folgt in 168 (RPC dort).
12. **Organisation strikt getrennt.** Die Auswertung läuft je Organisation; jede Abfrage ist an die `organization_id` der Regel gebunden. Technische Rechte des Jobs erweitern nie den Auswertungsbereich (Masterplan §4.D).
13. **Not-Aus.** Eine Einstellungstabelle mit einem Schalter `auswertung_aktiv` (global). Ist er aus, prüft der Job nichts, schreibt aber weiterhin ein Lebenszeichen mit Vermerk „pausiert“. Frontend-Rollback allein stoppt nichts (Masterplan §8). Umschalten nur per SQL durch Marc (Befehl in der Fach-Doku); kein Client-Zugriff.
14. **Lebenszeichen.** Jeder Lauf schreibt Start, Ende, Dauer, Anzahl geprüfter Regeln, Anzahl Ereignisse, Anzahl Fehler, Vermerk (`ok`, `pausiert`, `teilweise_fehler`). Eine RPC liefert berechtigten Nutzern „letzter Lauf vor X Minuten“ und `ueberfaellig = true`, wenn der letzte erfolgreiche Lauf älter als **15 Minuten** ist. Läufe älter als 30 Tage löscht der Tagesjob.
15. **Ereignisse sind unveränderlich.** Kein `UPDATE`/`DELETE` für Clients; Lesebestätigung/Quittierung kommen in 168 als eigene Tabelle. Aufbewahrungsfrist für Ereignisse ist noch nicht entschieden (Masterplan §9.2): **167 löscht keine Ereignisse.**

### 2.2 Datenbank (neue Migration `supabase/migrations/20261124_dashboard_alarms.sql`)

16. **Erweiterung:** `CREATE EXTENSION IF NOT EXISTS pg_cron` (Schema wie von Supabase vorgesehen). Der Builder prüft in T0, dass die lokale Supabase-CLI-Datenbank `pg_cron` laden kann; falls nicht, wird das Einplanen in einen geschützten `DO`-Block verschoben, der ohne Erweiterung nichts tut, und die Tests rufen die Funktionen direkt auf. `verify:migrations` (leere DB und Upgrade v2.2.0) muss in beiden Fällen grün sein.
17. **Tabellen** (alle mit RLS, `organization_id NOT NULL`, Indizes für die Leserichtung):
    - `dashboard_alarm_rules`: `id`, `organization_id`, `dashboard_id` (FK, `ON DELETE CASCADE`), `tile_id TEXT`, `catalog_id TEXT`, `pipeline TEXT NULL`, `mindestdauer_minuten INT` (0–120, Standard 10), `abklingzeit_minuten INT` (0–1440, Standard 60), `status TEXT` (`aktiv`, `pausiert`), `pause_grund TEXT NULL` (`manuell`, `verantwortlicher_ohne_rechte`, `kachel_entfernt`, `kennzahl_nicht_alarmfaehig`), `created_by_user_id`, `verantwortlich_user_id`, `created_at`, `updated_at`; eindeutig je `(dashboard_id, tile_id)`.
    - `dashboard_alarm_state`: `rule_id` (PK, FK cascade), `organization_id`, `beobachtete_stufe`, `beobachtet_seit`, `bestaetigte_stufe`, `bestaetigt_seit`, `letzter_wert NUMERIC NULL`, `einheit`, `grenze NUMERIC NULL`, `datenstand TIMESTAMPTZ NULL`, `letzte_auswertung`, `letztes_ereignis_at`, `letztes_ereignis_stufe`, `fehlertext TEXT NULL`.
    - `dashboard_alarm_events`: `id`, `organization_id`, `rule_id` (FK `ON DELETE SET NULL`, damit das Protokoll das Löschen einer Regel überlebt), `dashboard_id`, `tile_id`, `catalog_id`, `art` (`stufenwechsel`, `pausiert`, `fortgesetzt`), `von_stufe`, `nach_stufe`, `wert`, `einheit`, `grenze`, `datenstand`, `created_at`.
    - `alarm_worker_runs`: `id`, `started_at`, `finished_at`, `dauer_ms`, `regeln_geprueft`, `ereignisse`, `fehler`, `vermerk`. Keine Organisationsdaten in Fehlertexten.
    - `alarm_settings`: genau eine Zeile (`id = 1`, Check), `auswertung_aktiv BOOLEAN NOT NULL DEFAULT TRUE`, `updated_at`.
18. **Zugriff:** Clients (`authenticated`) haben **kein** direktes `INSERT/UPDATE/DELETE` auf diese Tabellen; Schreiben nur über RPCs bzw. die Job-Funktionen. `SELECT` per RLS nach 2.1 Nr. 10 (Regeln, Zustand, Ereignisse); `alarm_worker_runs` und `alarm_settings` gar nicht direkt lesbar. `anon` nichts. `supabase/tests/rls_coverage.sql` deckt die neuen Tabellen ab.
19. **CRM-Rechnung teilen statt nachbauen:** Der Rechenkern von `dashboard_crm_pipeline_overview` wird in eine interne Funktion `dashboard_crm_pipeline_overview_for_org(p_org UUID, p_pipeline TEXT)` (`SECURITY DEFINER`, fester `search_path`, **nicht** an `authenticated`/`anon` freigegeben) verschoben. Die öffentliche Funktion behält Signatur, Rechte- und Mitgliedschaftsprüfung und ruft den Kern mit `current_organization_id()` auf. Ein pgTAP-Test belegt, dass die öffentliche Funktion vor und nach der Änderung für die Fixtures aus `dashboard_query_parity/deals_parity_cases.json` dasselbe JSON liefert.
20. **Funktionen** (alle `SECURITY DEFINER`, `SET search_path = public, pg_temp`, `REVOKE ALL ... FROM PUBLIC, anon, authenticated`, wo nicht anders genannt):
    - `alarm_evaluate_threshold(p_rule JSONB, p_wert NUMERIC, p_zustand TEXT, p_einheit TEXT) RETURNS JSONB` (`{stufe, grenze}`), `IMMUTABLE`, reiner Nachbau von `evaluateThresholdV2` inkl. Altregel-Übersetzung. Für Tests an `authenticated` freigegeben (enthält keine Daten).
    - `alarm_kpi_value(p_org UUID, p_catalog_id TEXT, p_pipeline TEXT) RETURNS JSONB` (`{wert, einheit, zustand, datenstand}`), nur für die alarmfähigen IDs; andere IDs → `zustand = 'nicht_unterstuetzt'`.
    - `evaluate_dashboard_alarms(p_now TIMESTAMPTZ DEFAULT now()) RETURNS JSONB`: ein Lauf über alle Organisationen, je Regel in einem eigenen `BEGIN … EXCEPTION`-Block (ein Fehler stoppt nie den ganzen Lauf), schreibt Zustand, Ereignisse, Lauf. `p_now` macht Mindestdauer und Abklingzeit deterministisch testbar. `statement_timeout` für die Funktion 60 s.
    - `cleanup_dashboard_revisions(p_now TIMESTAMPTZ DEFAULT now()) RETURNS JSONB` nach 2.2 Nr. 22.
    - Einplanung (Nr. 16): `cron.schedule('dashboard-alarms', '*/5 * * * *', 'SELECT public.evaluate_dashboard_alarms()')` und `cron.schedule('dashboard-daily-cleanup', '17 3 * * *', 'SELECT public.cleanup_dashboard_revisions(); DELETE FROM public.alarm_worker_runs WHERE started_at < now() - interval ''30 days''')`; idempotent (vorher gleichnamige Jobs entfernen).
21. **RPCs für die App** (an `authenticated`, Prüfung im Funktionskörper; Fehler als deutsche Meldungen mit stabilen Codes wie bei 162/165):
    - `create_dashboard_alarm_rule(p_dashboard_id, p_tile_id, p_mindestdauer, p_abklingzeit)` – liest Kennzahl und Filter aus der gespeicherten Konfiguration (nicht vom Client), prüft 2.1 Nr. 2 und Nr. 10, legt Regel und leeren Zustand an, schreibt `audit_log` (`dashboard_alarm_rule.created`).
    - `update_dashboard_alarm_rule(p_rule_id, p_mindestdauer, p_abklingzeit)`, `pause_dashboard_alarm_rule(p_rule_id)`, `resume_dashboard_alarm_rule(p_rule_id)` (nur wenn der Aufrufende selbst die Rechte hat; ein wegen Rechteverlust pausierte Regel kann nur ein Admin fortsetzen und wird dabei **nicht** übernommen – Übernahme ist 168), `delete_dashboard_alarm_rule(p_rule_id)`; jeweils Audit-Eintrag.
    - `list_dashboard_alarm_rules(p_dashboard_id)` → Regeln mit Zustand.
    - `list_dashboard_alarm_events(p_dashboard_id UUID DEFAULT NULL, p_before TIMESTAMPTZ DEFAULT NULL, p_limit INT DEFAULT 50)` → neueste zuerst, max. 200.
    - `alarm_worker_status()` → `{letzter_lauf, letzter_erfolg, ueberfaellig, auswertung_aktiv}` für aktive Mitglieder; nur Admins sehen zusätzlich Fehlerzahlen.
22. **Aufbewahrung der Revisionen (Auftrag 165 §8, Entscheidung Marc 18.11.2026):** Gelöscht wird eine Revision nur, wenn **alle** Bedingungen gelten: (a) sie gehört nicht zu den letzten 100 Revisionen ihres Dashboards, (b) sie ist älter als 12 Monate, (c) sie ist nicht Revision 1, (d) sie ist nicht Quelle einer Wiederherstellung. Für (d) gilt eine Revision `N` als Quelle, wenn eine spätere Revision desselben Dashboards `change_summary = 'Wiederherstellung von Revision N'` trägt (Text aus `dashboardRevisionServiceV2.ts:276`); im Zweifel bleibt eine Revision erhalten. Je Dashboard mit Löschungen ein `audit_log`-Eintrag (`dashboard_revisions.retention_cleanup`, `details`: Anzahl, ältestes und jüngstes gelöschtes Datum). Die laufende Revision des Dashboards wird nie gelöscht. Der Hinweis in der Versionsliste folgt in 168.

### 2.3 Client (nur Matrix, Verifier, Fixtures – keine Oberfläche)

23. `AlarmCapabilityStatus` erhält `alarmfaehig`. Eine `pruefbar`-ID wird erst nach bestandenem Paritätstest (2.4 Nr. 27) auf `alarmfaehig` gesetzt; besteht eine ID nicht, bleibt sie `pruefbar` mit Grund im Eintrag und im BUILD_LOG. Die Inspector-Anzeige aus 166 behandelt `alarmfaehig` wie `pruefbar` (Schwellenwerte erlaubt); weitere UI-Änderungen gehören zu 168.
24. `scripts/verifyAlarmCapability.ts` prüft zusätzlich: Jede `alarmfaehig`-ID kommt in der Server-Liste vor und umgekehrt (Quelle: `supabase/tests/fixtures/alarm_parity/alarm_kpis.json`, die die Migration abbildet; pgTAP prüft dieselbe Datei gegen `alarm_kpi_value`), und jede `alarmfaehig`-ID hat mindestens einen Paritätsfall.
25. Neu `scripts/generateAlarmParitySql.ts`: erzeugt aus `thresholdReferenceCases.json` und den Paritäts-Fixtures die pgTAP-Datei `supabase/tests/dashboard_alarm_parity.sql` (generiert, Kopfkommentar „nicht von Hand ändern“). `--check` schlägt fehl, wenn die Datei nicht zum JSON passt; `--check` läuft in §7 und im CI-Job `livekpi-verifiers` (Aufnahme dort nur als zusätzlicher Schritt, keine anderen CI-Änderungen).
26. `thresholdRuleV2.ts` bleibt **unverändert** (400 Zeilen). Fehlende Referenzfälle für den Server (z. B. sehr große Zahlen, viele Nachkommastellen) kommen nur ins JSON.

### 2.4 Tests und Nachweise

27. **Paritätstest je alarmfähiger KPI:** Neu `supabase/tests/fixtures/alarm_parity/` mit Datenbeständen (leer, ein Wert, mehrere Werte mit gleichem `occurred_at` und unterschiedlichem `ingested_at`, nicht endlicher Wert, `degraded`, zwei Organisationen mit unterschiedlichen Werten, CRM mit und ohne `pipeline`-Filter, Deals ohne Betrag). Vitest rechnet die App-Seite mit den echten Client-Funktionen (`getPipelineOverview`, Live-Auflösung aus `resolveLive.ts` mit einem Store im Zustand `live`), pgTAP rechnet die Server-Seite mit `alarm_kpi_value`; beide vergleichen gegen dieselben `erwartet`-Werte im JSON (Wert, Einheit, Zustand).
28. **pgTAP** (neue Dateien `dashboard_alarms.sql`, `dashboard_alarm_rules_rights.sql`, `dashboard_revision_retention.sql`, generiert `dashboard_alarm_parity.sql`):
    - Referenzfälle: alle Fälle aus `thresholdReferenceCases.json` gegen `alarm_evaluate_threshold`.
    - Grenzen exakt: Wert genau auf Warnung/Kritisch, Zielbereich-Ränder.
    - Mindestdauer: Wechsel bei Lauf 1, bestätigt erst nach `mindestdauer`; Rückkehr ebenso; `mindestdauer = 0` sofort.
    - Deduplizierung: 10 Läufe gleiche Stufe → 1 Ereignis.
    - Abklingzeit: normal→warnung→normal→warnung innerhalb der Abklingzeit → nur ein Ereignis „→ warnung“; Eskalation zu kritisch innerhalb der Abklingzeit → Ereignis.
    - Neustart: Zustand vorhanden, Lauf nach 2 h Pause → keine Ereignisse ohne Wechsel.
    - Fehlerisolation: eine Regel wirft eine Ausnahme → `auswertungsfehler` nur bei ihr, andere Regeln normal ausgewertet, Lauf vermerkt `teilweise_fehler`.
    - Kachel gelöscht oder Schwellenwert entfernt → Regel `pausiert` (`kachel_entfernt`), ein Ereignis.
    - Einheit geändert → `regel_ungueltig`.
    - Rechteverlust: Verantwortlicher wird Viewer / inaktiv / verliert Team-Zuordnung → `pausiert` (`verantwortlicher_ohne_rechte`), keine weitere Auswertung.
    - Not-Aus: `auswertung_aktiv = false` → keine Zustandsänderung, Lauf mit `pausiert`.
    - Lebenszeichen: `alarm_worker_status()` meldet `ueberfaellig` bei letztem Erfolg vor 16 Minuten, nicht bei 14.
    - Rechte (negativ): Viewer kann keine Regel anlegen; Manager nicht für fremdes Team; Organisation B sieht keine Regeln/Ereignisse von A, auch nicht per direktem RPC-Aufruf mit fremder ID; `anon` nichts; Client kann `dashboard_alarm_events` nicht ändern; `evaluate_dashboard_alarms` und `cleanup_dashboard_revisions` sind für `authenticated` nicht ausführbar.
    - Kennzahl nicht alarmfähig (`baseline.*`, Zeitreihe, unbekannter Filter) → Anlegen abgelehnt mit Grund.
    - Aufbewahrung: Dashboard mit 130 Revisionen über 2 Jahre → genau die Revisionen gelöscht, die (a)–(d) erfüllen; Revision 1 und Wiederherstellungsquelle bleiben; Audit-Eintrag mit Anzahl; zweiter Lauf löscht nichts mehr.
    - Gleichheit `dashboard_crm_pipeline_overview` vor/nach Umbau (2.2 Nr. 19).
29. **Vitest:** Paritätsseite der App (Nr. 27), erweiterte Matrix (`alarmfaehig` nur mit Paritätsfall), Generator `--check` (veraltete Datei wird erkannt).
30. **Leistung:** pgTAP oder Skript `scripts/measureAlarmRun.sql`: 200 aktive Regeln in 5 Organisationen, ein Lauf < 2 s lokal; Messwert im BUILD_LOG.
31. **Bestehende Tests** (`supabase test db` komplett, `verify:migrations`, `verify:realtime`, alle Vitest- und E2E-Suiten) bleiben grün. Keine UI-Änderung, daher keine Screenshots (im BUILD_LOG begründen).

### 2.5 Dokumentation

32. **Korrektur aus 166 (T1, eigener Commit):** `SCHWELLENWERTE_P13A.md` §6 wird **nicht gelöscht**, sondern mit datiertem Revisionsvermerk versehen: „Revision 18.11.2026 (Auftrag 167): Der hier beschriebene Out-of-Process Worker entspricht nicht Marcs Entscheidung. Maßgeblich ist Auftrag 166 §8: `pg_cron` in der Datenbank, 5 Minuten, Ausfallhinweis ab 15 Minuten, Alarmregeln nur Manager/Admin.“ Ebenso §5: Beispiele für `pruefbar` richtigstellen (CRM-Pipeline- und Live-Kennzahlen; `baseline.*` ausgeschlossen). Masterplan §9.2 Zeile „Ausführung des Alarm-Workers …“: datierter Vermerk mit derselben Richtigstellung. `ARCHITECTURE_DECISIONS.md` D4: neue Protokollzeile 2026-11-18 (Auftrag 167) mit der Richtigstellung, die alte Zeile bleibt stehen. `docs/BUILD_LOG.md`: Richtigstellung im Builder-Eintrag 167, den Eintrag 166 nicht ändern. Nichts aus Teil-A-Historien umschreiben.
33. Neu `docs/dashboard/ALARME_P13B.md`: Tabellen, Zustandsdiagramm (beobachtet → bestätigt → Ereignis), Mindestdauer/Abklingzeit mit Beispielen, Rechte, Pausieren bei Rechteverlust, Not-Aus mit SQL-Befehl, Lebenszeichen, Paritätsnachweis je KPI (Tabelle), Aufbewahrungsregel, **Betriebsanleitung für Marc** (pg_cron im Hosted-Projekt aktivieren, Migration anwenden, Job prüfen mit `SELECT * FROM cron.job;` und `SELECT public.alarm_worker_status();`, Not-Aus ein/aus).
34. `DASHBOARD_EDITOR_MASTERPLAN.md` §6: datierter Nachtrag „Umsetzungsstand P13b“. §9.2: Zeile „Aufbewahrung …“ mit Vermerk „Revisionen umgesetzt in 167; Alarmereignisse weiter offen“; Zeile „Gemeinsame Fachformeln …“ mit Vermerk auf `alarm_evaluate_threshold` + generierte Paritätstests.
35. `ARCHITECTURE_DECISIONS.md` Teil C: nur ergänzen (Schwellenwert hat eine Quelle in der Konfiguration; CRM-Kern als gemeinsame Serverfunktion; generierte pgTAP-Parität; kein Datenalter-Kriterium ohne Entscheidung; Ereignisse unveränderlich).
36. `BUILD_PLAN.md` „Aktueller Auftrag“ auf 167; `docs/BUILD_LOG.md` Builder-Eintrag.

## 3. Verbindliche Grenzen

1. **Schutzbereiche** unverändert: `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`.
2. **Server nur wie beschrieben:** genau eine neue Migration `20261124_dashboard_alarms.sql`; bestehende Migrationen werden nicht geändert. `dashboard_crm_pipeline_overview` ändert Signatur, Rechte und Ergebnis nicht. Keine neue Edge Function, kein `pg_net`, kein Service-Key im Code, keine externen Dienste.
3. **Keine Oberfläche:** `src/features/dashboard/components/**`, `pages/**`, `preview/**` unverändert; Ausnahme: keine. (Die Inspector-Behandlung von `alarmfaehig` ergibt sich aus dem Status-Typ; braucht sie eine Codeänderung in `components/`, stoppen und im PR begründen.)
4. **Keine Datenabfragen im Client neu oder geändert:** `src/features/dashboard/data`, `src/services/liveKpi`, `src/domain`, `crmRepository.ts`, `src/hooks/queries/**` unverändert (Tests dürfen sie aufrufen).
5. **`src/auth/permissions.ts` unverändert;** Rechte werden im Server geprüft.
6. **Keine neuen Abhängigkeiten.**
7. **`max-lines` 400** für neue/geänderte TS-Dateien; `thresholdRuleV2.ts` unverändert.
8. **Tests zuerst**, Rot-Läufe im BUILD_LOG: (a) pgTAP „Referenzfall hoch-02 → `warnung`“ gegen `alarm_evaluate_threshold` → heute rot (Funktion fehlt); (b) pgTAP „10 Läufe gleiche Stufe → 1 Ereignis“ → rot; (c) pgTAP „Viewer legt Regel an → abgelehnt“ → rot (RPC fehlt); (d) Vitest „jede `alarmfaehig`-ID hat Paritätsfall und Server-Eintrag“ → rot; (e) pgTAP Aufbewahrung „130 Revisionen → erwartete Anzahl gelöscht“ → rot.
9. **Bundle unverändert** (keine Client-Laufzeitänderung außer Matrix-Status; `size-limit` vorher/nachher im BUILD_LOG).
10. **Keine Secrets, keine Hosted-Änderung** durch den Builder. Aktivieren von `pg_cron` und Anwenden der Migration im Hosted-Projekt macht Marc nach Merge (Anleitung in Nr. 33).

## 4. Ziel-Dateien

| Pfad                                                                                                                                                                                         | Änderung                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_167_SERVER_ALARME.md`                                                                                                                                    | Dieser Auftrag (Checkboxen, Status)                         |
| neu `supabase/migrations/20261124_dashboard_alarms.sql`                                                                                                                                      | Tabellen, Funktionen, RPCs, Einplanung (2.2)                |
| `supabase/schema.sql`                                                                                                                                                                        | nur falls `verify:migrations` die Schemagleichheit verlangt |
| neu `supabase/tests/dashboard_alarms.sql`, `dashboard_alarm_rules_rights.sql`, `dashboard_revision_retention.sql`, generiert `dashboard_alarm_parity.sql`; `supabase/tests/rls_coverage.sql` | pgTAP (2.4 Nr. 28)                                          |
| neu `supabase/tests/fixtures/alarm_parity/*.json`                                                                                                                                            | Paritäts-Fixtures (2.4 Nr. 27)                              |
| `src/features/dashboard/model/alarmCapability.ts`, `model/catalog/alarmEntries.ts`, `model/thresholdReferenceCases.json` (nur ergänzen)                                                      | Status `alarmfaehig` (2.3 Nr. 23, 26)                       |
| `scripts/verifyAlarmCapability.ts`, neu `scripts/generateAlarmParitySql.ts`, neu `scripts/measureAlarmRun.sql`                                                                               | Verifier, Generator, Messung                                |
| `.github/workflows/ci.yml` (nur ein Schritt im Job `livekpi-verifiers`)                                                                                                                      | Generator-`--check` (2.3 Nr. 25)                            |
| `src/features/dashboard/__tests__/*` (neu bzw. ergänzt)                                                                                                                                      | Vitest (2.4 Nr. 27, 29)                                     |
| `docs/dashboard/SCHWELLENWERTE_P13A.md`, neu `docs/dashboard/ALARME_P13B.md`, `DASHBOARD_EDITOR_MASTERPLAN.md`, `ARCHITECTURE_DECISIONS.md`, `BUILD_PLAN.md`, `docs/BUILD_LOG.md`            | Doku (2.5)                                                  |

Bei Bedarf außerhalb dieser Liste: stoppen und im PR begründen (`CLAUDE.md` §5.3).

## 5. Tasks

Reihenfolge je Block: Tests zuerst, dann Umsetzung.

- [ ] **T0 Einstieg:** Baseline festlegen, Ist-Tabelle §1 prüfen, `pg_cron` lokal prüfen (2.2 Nr. 16), exakte JSON-Schlüssel von `dashboard_crm_pipeline_overview` je CRM-Kennzahl und Katalogeinheit je alarmfähiger ID notieren, Schreibrechte-Helfer aus 162 benennen, `size-limit` notieren.
- [ ] **T1 Doku-Korrektur 166:** 2.5 Nr. 32 als eigener Commit.
- [ ] **T2 Rot-Nachweise:** §3 Nr. 8 (a)–(e).
- [ ] **T3 Tabellen, RLS, Not-Aus, Lebenszeichen:** 2.2 Nr. 17–18, 2.1 Nr. 13–14.
- [ ] **T4 Bewertungsfunktion und generierte Parität:** 2.2 Nr. 20 (`alarm_evaluate_threshold`), 2.3 Nr. 25–26.
- [ ] **T5 Werte und CRM-Kern:** 2.2 Nr. 19, `alarm_kpi_value`, Paritäts-Fixtures 2.4 Nr. 27; danach Matrix 2.3 Nr. 23–24.
- [ ] **T6 Auswertung:** `evaluate_dashboard_alarms` mit 2.1 Nr. 5–9, 11–12; pgTAP 2.4 Nr. 28.
- [ ] **T7 RPCs und Rechte:** 2.2 Nr. 21, Negativtests.
- [ ] **T8 Aufbewahrung und Einplanung:** 2.2 Nr. 22, `cron.schedule` (Nr. 20).
- [ ] **T9 Leistung:** 2.4 Nr. 30.
- [ ] **T10 Doku:** 2.5 Nr. 33–36.
- [ ] **T11 Abschluss:** Pflicht-Verifikation (§7), Schutzbereichs-Diff, BUILD_LOG-Eintrag mit Smoke für Marc (lokal: `supabase db reset`, eine Regel per SQL-Konsole als Manager anlegen, `SELECT public.evaluate_dashboard_alarms(now())` zweimal mit 15 Minuten Abstand über `p_now`, Ereignis in `list_dashboard_alarm_events` sehen), PR öffnen, Review anfordern.

## 6. Abnahme

- Alarme werden ohne Browser alle 5 Minuten auf dem Server geprüft; ein Lauf erzeugt nur bei echtem, bestätigtem Wechsel ein Ereignis.
- Jede als `alarmfaehig` freigeschaltete Kennzahl hat einen bestandenen Paritätstest; Basis-/Planwerte, Zeitreihen und nicht unterstützte Filter lassen sich nicht als Alarm anlegen.
- Mindestdauer, Abklingzeit, Deduplizierung, Neustart, „keine Daten“, Auswertungsfehler und Not-Aus sind durch pgTAP belegt.
- Ausfall des Jobs ist über `alarm_worker_status()` erkennbar (überfällig nach 15 Minuten).
- Regeln, deren Verantwortlicher die Rechte verliert, pausieren automatisch und bleiben erhalten.
- Organisationen sind strikt getrennt; Viewer verwalten keine Regeln.
- Alte Dashboard-Versionen werden nach der Regel aus 165 §8 aufgeräumt, mit Audit-Eintrag; Revision 1 und Wiederherstellungsquellen bleiben.
- Die Doku-Fehler aus 166 sind mit datiertem Vermerk richtiggestellt.
- Schutzbereichs-Diff leer, keine UI-Änderung, keine neuen Abhängigkeiten, Bundle unverändert.

## 7. Pflicht-Verifikation

```
npx tsc --noEmit
npm run lint
npm run format:check
npm test
npm run verify
npm run build
npm run build:production      # mit gültiger Beispielkonfiguration
npx size-limit
npx tsx scripts/verifyLiveKpiCatalog.ts
npx tsx scripts/verifyAlarmCapability.ts
npx tsx scripts/generateAlarmParitySql.ts --check
supabase db reset --yes && supabase test db
npm run verify:migrations
npm run verify:realtime -- --fail-if-offline
npx playwright test          # vollständige Suite, unverändert grün
git diff <baseline> -- src/simulation src/types src/context src/services/data src/features/resources   # leer
git diff <baseline> -- src/features/dashboard/components src/features/dashboard/pages src/features/dashboard/preview src/auth src/services/liveKpi src/domain src/features/dashboard/data src/hooks/queries   # leer
git diff <baseline> --stat -- supabase/migrations   # nur 20261124_dashboard_alarms.sql neu
```

CI-Checks `lint`, `typecheck`, `test`, `build`, `livekpi-verifiers`, `size-limit`, `e2e` grün.

## 8. Rückweg

- **Sofort:** Not-Aus (`UPDATE public.alarm_settings SET auswertung_aktiv = false WHERE id = 1;`) stoppt jede Auswertung; Lebenszeichen zeigt „pausiert“.
- **Job entfernen:** `SELECT cron.unschedule('dashboard-alarms'); SELECT cron.unschedule('dashboard-daily-cleanup');`
- **Daten:** Regeln, Zustände und Ereignisse bleiben bei Frontend-Rollback erhalten. Ein Entfernen der Tabellen wäre ein eigener, von Marc freigegebener Auftrag.
- **Aufbewahrung:** Gelöschte Revisionen sind nicht wiederherstellbar. Deshalb läuft der Tagesjob erst, wenn Marc nach Deploy `SELECT public.cleanup_dashboard_revisions(now())` einmal manuell geprüft hat (Anzahl im Ergebnis), oder der Builder plant ihn in der Migration zunächst **deaktiviert** ein (`cron.alter_job(..., active := false)`) und die Fach-Doku beschreibt das Einschalten. **Vorgabe: deaktiviert einplanen.**

## 9. Offene Punkte und Risiken

- **Datenalter für Live-Werte:** Ab wann ein Live-Wert auf dem Server „veraltet“ (→ `nicht_bewertet`) heißt, ist nicht entschieden. 167 bewertet jeden vorhandenen Wert und zeigt den Datenstand. Vorschlag für eine spätere Entscheidung Marc: 24 Stunden ohne neuen Wert → `nicht_bewertet`, in App und Server gleich.
- **Aufbewahrung der Alarmereignisse** ist offen (Masterplan §9.2). 167 löscht keine Ereignisse. Vorschlag: 12 Monate, wie bei Revisionen.
- **Hosted:** `pg_cron` muss im Supabase-Projekt aktiviert sein (Dashboard → Database → Extensions), bevor die Migration läuft. Ohne Aktivierung bricht die Migration ab; die Anleitung steht in `ALARME_P13B.md`.
- **Lastspitzen:** Ein Lauf wertet alle Regeln aus. Bei mehr als 1.000 Regeln ist eine Aufteilung nach Organisationen nötig (nicht Teil dieses Auftrags).
- **Restore-Erkennung über Text:** Wiederherstellungsquellen werden aus `change_summary` erkannt. Ändert ein späterer Auftrag diesen Text, muss er die Aufbewahrung mitziehen (Test in `dashboard_revision_retention.sql` schlägt dann an).
- **Nicht Teil dieses Auftrags:** jede Oberfläche (168), Quittierung (168), Admin-Übernahme (168), externe Kanäle (P18), Alarme auf Transformationen (P14), Alarmregeln in Export/Import.
