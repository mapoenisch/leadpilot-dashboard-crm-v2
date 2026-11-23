# Gesamtabnahme Dashboard-Editor V2 (P16a, Auftrag 173)

Stand: 22.11.2026, Baseline `c48ac8b1` (main nach Merge von 172). Builder: Claude Code.
Grundlage: [Masterplan](DASHBOARD_EDITOR_MASTERPLAN.md) §6, §7, §8; [Auftrag 173](../auftraege/ANTIGRAVITY_AUFTRAG_173_GESAMTABNAHME_ABGLEICH.md).

**Ergebnis in einem Satz:** Alle Abnahmezeilen aus Masterplan §7 haben einen Nachweis. Ein Lastzielwert (Speichertrend) ist verfehlt; der Verlauf zeigt ein Plateau statt eines Lecks (§3.1). Eine Zeile ist wegen **Befund B-1** (Alarm-RPCs ohne Prüfung des Dashboard-Rechts) nur eingeschränkt erfüllt. Laut Auftrag 174 („Abnahmematrix ohne offene Befunde“) muss B-1 vor 174 behoben sein. Vorschlag: Zwischenauftrag 173a.

Diese Abnahme stellt niemanden um. Der Rollout-Schalter ist unverändert (`isDashboardEditorV2Enabled()`, Standard `false`).

---

## 1. Paketstand P01–P15

| Paket | Inhalt                                             | Auftrag / PR                                         | Stand   |
| ----- | -------------------------------------------------- | ---------------------------------------------------- | ------- |
| P01   | Bestandsprüfung                                    | 144 / #168                                           | gemergt |
| P02   | UX und Fachverträge                                | 145 / #169                                           | gemergt |
| P03   | Grid-Vergleich, Zielmodell                         | 146 / #170                                           | gemergt |
| P04   | Editor-Kern, Rollout-Schalter                      | 147 / #171, #172                                     | gemergt |
| P05   | Vier-Zonen-Shell, Bibliothek, Inspector            | 148 / #173                                           | gemergt |
| P06   | Rasterengine                                       | 149 / #174                                           | gemergt |
| P07   | Speicherstruktur, RLS, Revisionen, Kopiermigration | 150 / #175                                           | gemergt |
| P06b  | Raster-Invarianten                                 | 151 / #177                                           | gemergt |
| —     | Sicherheit, Live-Feed-Mandantenbindung             | 152 / #178, 153 / #179                               | gemergt |
| P08   | Abfragevertrag, Panel-Editor, CRM-Vollbestand      | 154 / #181, 155 / #182, 156 / #184                   | gemergt |
| P09   | Sektionen, Vorlagen, Dashboard-Auswahl             | 157 / #185, 158 / #186, #188                         | gemergt |
| P10   | Zeitsteuerung, Server-Zeitreihen, Zeitpunkt        | 159 / #187, 160 / #194, 161 / #196, 164 / #201, #203 | gemergt |
| P11   | Team-Freigaben (Server, Oberfläche)                | 162 / #197, 163 / #200, #202                         | gemergt |
| P12   | Versionen, Import/Export                           | 165 / #204                                           | gemergt |
| P13   | Schwellenwerte, Server-Alarme, Alarm-Oberfläche    | 166 / #205, 167 / #206, 168 / #209                   | gemergt |
| P14   | Transformationen, Vergleich, Heatmap, Bänder       | 169 / #210, 170 / #211                               | gemergt |
| P15   | Kiosk, Rotation, Sitzung, mobil, A11y, Report      | 171 / #212, 172 / #213                               | gemergt |

Kein Paket fehlt. Datenabhängig deaktiviert (Masterplan §6.1): Alarme nur für die 16 Kennzahlen mit Paritätsnachweis (`alarm_kpis.json`), Erwartungsbänder nur bei ausreichender Historie (170 §8).

## 2. Abnahmematrix (Masterplan §7)

Legende Ergebnis: ✅ belegt · ⚠️ belegt mit Einschränkung. Neue Nachweise aus 173 sind **fett**.

### 2.1 Funktionale Prüfungen

| #   | Testfall                                              | Nachweis                                                                                                                                                                                      | Ergebnis | Einschränkung                                                                         |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| 1   | Hinzufügen, verschieben, skalieren, löschen, Undo     | `DashboardEditorShellV2.ui.vitest.tsx` („fügt eine Kachel … Undo/Redo“), `dashboardEditorCore.vitest.ts` (Drag = ein Undo-Schritt), `gridInvariants.vitest.ts`, `gridEngine.vitest.ts`        | ✅       | —                                                                                     |
| 2   | Panel ändern und abbrechen                            | `useDashboardEditor.ui.vitest.tsx:106` („Abbrechen verwirft den Entwurf …“), `TileConfigurator.ui.vitest.tsx`                                                                                 | ✅       | —                                                                                     |
| 3   | Datenupdate während Layoutänderung                    | `dashboardEditorCore.vitest.ts:194` (Live-Updates erzeugen kein Undo, ändern `isDirty` nicht), `gridDragScroll.ui.vitest.tsx`                                                                 | ✅       | —                                                                                     |
| 4   | Verlassen, Browser-Zurück, Sitzungsablauf             | `useDashboardEditor.ui.vitest.tsx:339` (beforeunload), `useInAppLinkGuard.ui.vitest.tsx`, `kioskSessionRotation.ui.vitest.tsx:111`                                                            | ✅       | —                                                                                     |
| 5   | Zwei Nutzer speichern denselben Team-Stand            | `dashboardStorageV2.vitest.ts:141` (Revisionskonflikt), `supabase/tests/dashboard_team_sharing.sql` (54), `e2e/team-dashboards.spec.ts`                                                       | ✅       | —                                                                                     |
| 6   | Fremde Organisation / unberechtigtes Team             | `dashboard_team_sharing.sql`, `tenant_isolation.sql`, **`dashboard_rights_matrix_p16.sql` Nr. 10, 12, 20–23** (direkter RPC-Aufruf), `e2e/tenant-isolation.spec.ts`                           | ⚠️       | Befund B-1: Alarm-RPCs prüfen innerhalb der eigenen Organisation kein Dashboard-Recht |
| 7   | KPI-Filter und mehrere CRM-Seiten                     | `dashboardQueryParity.vitest.ts:123` (1.500 Deals, Vollbestand statt 1.000er-Kappung), `crmRepository.paged.vitest.ts`, `supabase/tests/dashboard_query_contract.sql` (23)                    | ✅       | —                                                                                     |
| 8   | Reconnect, doppelte/ungeordnete Daten, Lücken         | `liveKpiStreamStore.vitest.ts` (sortiert, Duplikate entfernt, Reconnect-Status), `resolveTimeSeries.vitest.ts` (Lückenausweisung, Zeitumstellung)                                             | ✅       | —                                                                                     |
| 9   | Pause und historischer Zeitraum                       | `timeControl.vitest.ts`, `useTimeControlledData.ui.vitest.tsx`, `e2e/editor-time-point.spec.ts`; Server-Alarme sind vom Browser unabhängig: **`dashboard_operations_p16.sql`**                | ✅       | —                                                                                     |
| 10  | Schwellengrenze, fehlende Daten, Worker-Neustart      | `dashboard_alarms.sql` (Grenzfälle), **`dashboard_operations_p16.sql` Nr. 9–17** (Mindestdauer, Abklingzeit, Eskalation, Neustart ohne Doppelung, „keine Daten“)                              | ✅       | —                                                                                     |
| 11  | V1-Migration, unbekannte Version, beschädigter Import | `dashboardMigrationV1V2.vitest.ts`, `defaultDashboard.vitest.ts:94` (zukünftige Version nicht überschreiben), `dashboardExchangeV2.vitest.ts` (ungültiges JSON, fremdes Format, `__proto__`)  | ✅       | —                                                                                     |
| 12  | Teamsicht, persönliches Layout, Reportexport          | `reportV2.ui.vitest.tsx`, `reportV2Data.ui.vitest.tsx`, `teamDashboardReadOnly.ui.vitest.tsx`, `e2e/dashboard-report.spec.ts`; Lesen = Export: **`dashboard_rights_matrix_p16.sql` Nr. 5–11** | ✅       | —                                                                                     |

### 2.2 Zusätzliche Abnahmen aus der Opus-Gegenprüfung

| #   | Testfall                                                    | Nachweis                                                                                                                                                                                                     | Ergebnis | Einschränkung                                                                              |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------ |
| 13  | Kopiermigration erneut nach Änderung                        | **`dashboard_rollout_reconciliation.sql` Nr. 39–41** (keine Duplikate, bearbeiteter Stand bleibt), **Abgleich-Klassen Nr. 1–17**, **`useDashboardV2StorageSourceRevision.ui.vitest.tsx`** (Quellrevision)    | ✅       | siehe §5 Befund B-3 (alte Kopien ohne echte Quellrevision werden als „geändert“ angezeigt) |
| 14  | V2 nutzen und zurückwechseln                                | **`e2e/dashboard-rueckweg-probe.spec.ts`** (V1 unverändert, V2-Revisionen erhalten, erneutes Aktivieren ohne Verlust)                                                                                        | ⚠️       | sichtbarer Rückkehr-Hinweis im alten Editor folgt in 174 (T4)                              |
| 15  | Team-Dashboard mit identischen Filtern                      | **`dashboard_rights_matrix_p16.sql` Nr. 1–2** (Teammitglied und Nicht-Mitglied: gleiche Aggregation, nur eigene Organisation)                                                                                | ✅       | —                                                                                          |
| 16  | Client/Server-Parität Basis-KPI/Kombination                 | `supabase/tests/dashboard_alarm_parity.sql` (90), `alarmParity.vitest.ts`, `dashboardQueryParity.vitest.ts`                                                                                                  | ✅       | —                                                                                          |
| 17  | Statische Plan-/Baselinewerte oder globaler Feed als Quelle | `alarmCapability.vitest.ts:31` (Baseline ausgeschlossen), `create_dashboard_alarm_rule` lehnt Nicht-CRM-/Nicht-Live-Kennzahlen ab (`LP_ALARM_KPI_NOT_CAPABLE`)                                               | ✅       | —                                                                                          |
| 18  | Alarm-Worker fällt aus, Browser geschlossen                 | **`dashboard_operations_p16.sql` Nr. 1–2** (ohne Erfolg / 20 Min. alt → „überfällig“), `AlarmWorkerBanner` in `alarmComponents.ui.vitest.tsx`                                                                | ✅       | —                                                                                          |
| 19  | Ersteller tritt aus / verliert Rechte                       | **`dashboard_operations_p16.sql` Nr. 18–20** (Regel pausiert, keine Ereignisse, Dashboard bleibt), Übernahme nur Admin: **`dashboard_rights_matrix_p16.sql` Nr. 30**, `e2e/dashboard-alarms-preview.spec.ts` | ✅       | —                                                                                          |
| 20  | Inspector-Texteingabe und Undo                              | `dashboardEditorCore.vitest.ts:155` (Tippen gebündelt nach 600 ms), `:180` (Fokuswechsel schließt ab)                                                                                                        | ✅       | —                                                                                          |
| 21  | Kiosk über Token-Erneuerung und Ablauf                      | `kioskSessionRotation.ui.vitest.tsx:41–138`, `KioskShell.ui.vitest.tsx`, `e2e/dashboard-kiosk.spec.ts`                                                                                                       | ✅       | —                                                                                          |

## 3. Lasttest (§2.2 Nr. 6)

Skript: `scripts/loadTestDashboardV2.mjs` (`npx tsx scripts/loadTestDashboardV2.mjs`). Lokales Supabase, Produktions-Build über `vite preview`, Chromium, MacBook (Apple Silicon). Die Zielwerte wurden **vor** dem Lauf festgelegt und stehen auch im Skriptkopf:

| Messgröße                                    | Zielwert                                     |
| -------------------------------------------- | -------------------------------------------- |
| Server: Fehler je RPC                        | 0                                            |
| Server: p95 je RPC, 50 Leser je Organisation | < 1.000 ms                                   |
| Client: Datenabfragen je Öffnen              | < Kachelanzahl (24): Abfragen werden geteilt |
| Client: Realtime-Abos nach dem Schließen     | Beitritte = Austritte in jedem Zyklus        |
| Client: Speichertrend                        | letzte 20 % ≤ erste 20 % × 1,25              |
| Client: Bildwechsel beim Ziehen              | p95 < 50 ms                                  |

**Server** (2 Organisationen × 50 Leser × 20 Durchgänge × 2 RPCs = 4.000 Aufrufe):

| Organisation | RPC                               | p50   | p95    | p99    | max    | Fehler |
| ------------ | --------------------------------- | ----- | ------ | ------ | ------ | ------ |
| A            | `dashboard_crm_pipeline_overview` | 60 ms | 262 ms | 388 ms | 704 ms | 0      |
| A            | `dashboard_time_series`           | 62 ms | 273 ms | 431 ms | 655 ms | 0      |
| B            | `dashboard_crm_pipeline_overview` | 59 ms | 287 ms | 429 ms | 595 ms | 0      |
| B            | `dashboard_time_series`           | 55 ms | 255 ms | 383 ms | 696 ms | 0      |

Ziel erreicht. Einschränkung: Die 50 Leser je Organisation teilen ein Testkonto, weil der Seed nur wenige Nutzer hat. RLS und RPCs werden trotzdem je Aufruf geprüft. Der Seed ist klein; mit dem Vollbestand großer Organisationen prüft das `dashboardQueryParity` (1.500 Deals).

**Client:** siehe §3.1. Ziel bei Abfragen, Abos und Ziehen erreicht, beim Speicherzielwert verfehlt (begrenzter Cache-Aufbau, kein Leck).

### 3.1 Client-Messwerte

10 Minuten, 1.234 Zyklen Öffnen → Schließen per In-App-Navigation (der JavaScript-Kontext bleibt bestehen; nur so zeigen sich verwaiste Abos und Speicherzuwachs). 24 Kacheln aus Basiswerten, CRM, Live und Übersicht in 7 Darstellungen (Zahl, Gauge, Tabelle, Übersicht, Trichter, Linie, Heatmap).

| Messgröße                          | Ergebnis                                                                                                     | Ziel        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------- |
| Öffnen bis 24 Kacheln sichtbar     | p50 102 ms, p95 114 ms, max 152 ms                                                                            | —           |
| Datenabfragen je Öffnen            | höchstens 1 (`dashboard_crm_pipeline_overview` einmal für alle CRM-Kacheln; danach aus dem geteilten Cache)   | ✅ < 24     |
| Realtime-Abos                      | je Öffnen 1 Beitritt, je Schließen 1 Austritt; 0 Zyklen mit offenem Abo                                       | ✅          |
| Bildwechsel beim Ziehen            | p50 16,7 ms, p95 16,7 ms (60 Bilder/s)                                                                        | ✅ < 50 ms  |
| Speicher (nach erzwungener Bereinigung) | erste 20 %: 12,6 MB, letzte 20 %: 24,7 MB                                                               | ❌ ≤ × 1,25 |

**Speicher, Bewertung:** Der vorab festgelegte Zielwert ist verfehlt. Der Verlauf ist aber kein Leck. Er steigt bis Zyklus 604 (≈ 5 Minuten) auf etwa 24,6 MB und bleibt danach 5 Minuten lang flach (24,6–25,0 MB; Mittel der ersten und letzten Zehntel der zweiten Hälfte: 24,94 → 25,02 MB, +0,3 %). Das passt zur Haltezeit des Abfrage-Caches (React Query, 5 Minuten): zeitbezogene Abfrageschlüssel sammeln sich bis zu ihrem Verfall an, danach hält sich der Bestand die Waage. Die Zielformel war für einen kalten Start zu streng. Ich ändere sie nachträglich nicht. Vorschlag für die Prüfung: Für 174 als Zielwert „Plateau: zweite Hälfte ≤ +5 %“ festlegen. Rohdaten: `artifacts/auftrag-173/loadtest-client.json` (lokal, nicht im Repository).

Einschränkung: Gemessen auf Chromium am Mac mit lokalem Supabase. Die Live-Kacheln erhalten im Seed keine laufenden Ereignisse; gemessen sind Abo-Auf- und -Abbau, nicht die Last durch laufende Live-Updates.

## 4. Rechte-Gesamtprüfung (§2.2 Nr. 7)

Nachweis: `supabase/tests/dashboard_rights_matrix_p16.sql` (35 Tests, davon 5 als pgTAP-TODO für B-1), ergänzt durch `dashboard_team_sharing.sql`, `dashboard_alarm_rules_rights.sql`, `dashboard_rollout_reconciliation.sql` und die UI-Tests.

| Aktion                     | Viewer                       | Manager                                           | Admin                       | Fremde Org. | Anonym |
| -------------------------- | ---------------------------- | ------------------------------------------------- | --------------------------- | ----------- | ------ |
| Persönlich lesen/schreiben | eigenes ✅, fremdes ✗        | eigenes ✅, fremdes ✗                             | eigenes ✅, fremdes ✗       | ✗           | ✗      |
| Team lesen                 | nur als Mitglied             | nur als Mitglied                                  | alle Teams der Organisation | ✗           | ✗      |
| Team schreiben             | ✗ (`LP_TEAM_ACCESS_REVOKED`) | nur als Mitglied                                  | ✅                          | ✗           | ✗      |
| Freigeben (Kopie ans Team) | ✗                            | nur als Mitglied                                  | ✅                          | ✗           | ✗      |
| Alarmregel anlegen         | ✗                            | ✅ — **auch auf nicht lesbaren Dashboards (B-1)** | ✅                          | ✗           | ✗      |
| Alarmregel übernehmen      | ✗                            | ✗ (seit 168 nur Admin)                            | ✅                          | ✗           | —      |
| Import                     | ✅ persönlich                | ✅ persönlich                                     | ✅ persönlich               | —           | ✗      |
| Export / Kiosk             | = Lesen                      | = Lesen                                           | = Lesen                     | ✗           | ✗      |
| Umstellung vorbereiten     | ✗ (`LP_FORBIDDEN`)           | ✗                                                 | ✅ eigene Organisation      | ✗           | ✗      |

Rechteentzug während offener Sitzung: Entfernen aus dem Team → nächstes Speichern abgewiesen; deaktiviertes Mitglied → weder Team- noch eigenes Dashboard. In der Oberfläche führt das zum Rechteentzug-Dialog mit Rettung als persönliche Kopie (`e2e/team-dashboards.spec.ts`, `teamAccessRevokedDialog.ui.vitest.tsx`).

## 5. Befunde

| Nr. | Schwere | Befund                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Umgang                                                                                                                                                                                                                                                                                         |
| --- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-1 | hoch    | `create/update/pause/delete_dashboard_alarm_rule` (167) prüfen nur „Admin oder Manager der Organisation“, nicht das Lese- bzw. Schreibrecht am Dashboard. Ein Manager kann so Regeln auf fremden persönlichen Dashboards und auf Team-Dashboards ohne Mitgliedschaft anlegen, ändern, pausieren und löschen. `create` überschreibt per `ON CONFLICT (dashboard_id, tile_id)` eine bestehende fremde Regel und wird ihr Verantwortlicher. `list_dashboard_alarm_rules` zeigt jedem Mitglied die Regeln jedes Dashboards der Organisation. Fremde Organisationen bleiben ausgesperrt. | Als 5 pgTAP-TODO-Tests belegt (`dashboard_rights_matrix_p16.sql` Nr. 31–35). **Nicht in 173 behoben**, weil 173 genau eine Migration für den Abgleich vorsieht (§3). Vorschlag: Zwischenauftrag 173a vor 174. Danach werden die TODO-Tests zu regulären Tests.                                 |
| B-2 | mittel  | Der Rückkehr-Hinweis im alten Editor („Stand vom …; Änderungen im neuen Editor sind hier nicht enthalten“) fehlt noch.                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Laut Plan Teil von 174 §5/T4. Datenseite in 173 belegt (Rückweg-Probe).                                                                                                                                                                                                                        |
| B-3 | mittel  | Die Kopiermigration speicherte bisher immer `last_migrated_revision = 1` statt der echten V1-Revision (`useDashboardV2Storage` übergab sie nicht).                                                                                                                                                                                                                                                                                                                                                                                                                                  | In 173 behoben (Quellrevision bzw. 0 bei Kopie vom Standardstand). Bestehende Kopien: der Abgleich zeigt sie im Zweifel als „Alter Editor geändert“; der inhaltliche Vergleich zeigt dann „Keine inhaltlichen Unterschiede“, Übernehmen gleicht die Revisionen an. Keine stille Gleichsetzung. |
| B-4 | niedrig | `alarm_worker_status()` zählt `aktiveRegeln` über alle Organisationen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Nur eine Anzahl, keine Inhalte. Mit 173a mitnehmen (auf eigene Organisation begrenzen).                                                                                                                                                                                                        |
| B-5 | niedrig | Aufräumen in `e2e/team-dashboards.spec.ts` (`afterAll`) nutzt die nicht vorhandenen Tabellennamen `dashboards_v2`/`dashboard_teams_v2`; Testdaten bleiben in der lokalen DB liegen (Fehler wird verschluckt).                                                                                                                                                                                                                                                                                                                                                                       | Nur Testhygiene, keine Produktwirkung. Mit 173a mitnehmen.                                                                                                                                                                                                                                     |

## 6. Betrieb (§2.2 Nr. 8)

| Prüfung            | Nachweis                                                                                 | Ergebnis |
| ------------------ | ---------------------------------------------------------------------------------------- | -------- |
| Alarm-Not-Aus      | `dashboard_operations_p16.sql` Nr. 3–6: kein Lauf, Status „pausiert“, Lauf protokolliert | ✅       |
| Wiederanlauf       | Nr. 7–8: Auswertung läuft, Lebenszeichen „ok“                                            | ✅       |
| Lebenszeichen      | Nr. 1–2: ohne erfolgreichen Lauf bzw. nach 20 Min. „überfällig“                          | ✅       |
| Aufräumjob         | Nr. 21–22 (Alarmhistorie 12 Monate), `dashboard_revision_retention.sql` (Revisionen)     | ✅       |
| `build:production` | in der Pflicht-Verifikation (BUILD_LOG)                                                  | ✅       |

**Hosted-Migrationsstand** (gelesen am 22.11.2026 über die Supabase-Verwaltung, Projekt `leadpilot-crm`): eingespielt bis `20261122_dashboard_team_sharing`. Marc muss in dieser Reihenfolge anwenden:

1. `20261123_dashboard_revision_detail.sql` (165)
2. `20261124_dashboard_alarms.sql` (167; legt pg_cron-Jobs an, der tägliche Aufräumjob ist absichtlich **inaktiv**)
3. `20261125_dashboard_alarm_receipts.sql` (168)
4. `20261126_dashboard_transformations.sql` (169)
5. `20261127_dashboard_time_series_compare.sql` (170)
6. `20261128_dashboard_rollout_reconciliation.sql` (173)

Nach Schritt 2: einmal `SELECT public.cleanup_dashboard_revisions();` von Hand prüfen und erst dann `dashboard-daily-cleanup` aktivieren (Vorgabe 167).

## 7. Rückweg-Probe (§2.2 Nr. 9)

`e2e/dashboard-rueckweg-probe.spec.ts` (lokales Supabase, Konto Manager A): Der alte Editor zeigt seinen Stand (2 Kacheln). Dann wird der neue Editor aktiviert und die Pilotkopie umbenannt (neue Revision). Nach dem Zurückschalten zeigt der alte Editor unverändert 2 Kacheln, ohne den neuen Titel, und die V1-Zeile ist bytegleich. Die V2-Revision mit der Änderung bleibt erhalten, und erneutes Aktivieren zeigt die Änderung. Der sichtbare Hinweis auf den Datenstand im alten Editor kommt mit 174 (B-2).

## 8. Abgleich V1 ↔ V2

Migration `20261128_dashboard_rollout_reconciliation.sql`, Admin-Ansicht **Administration → Umstellung vorbereiten** (`/admin/umstellung`), Vorschau `dashboard-vorschau.html?bereich=umstellung`.

- Klassen `gleich`, `v1_geaendert`, `beide_geaendert`, `keine_kopie`, `nur_v2` werden serverseitig berechnet (`dashboard_rollout_classify`) und im Client gespiegelt (`classifyRollout`).
- „V2-Kopie“ = ältestes persönliches V2-Dashboard mit `metadata.migrated_from_v1`. „Bearbeitet“ = Revision über `metadata.migrated_v2_revision` (Erstkopie 1, nach Übernahme die Übernahmerevision). Das weicht bewusst von „V2-Revision > 1“ ab (Auftrag §2.1 Nr. 1): Sonst gälte eine übernommene Kopie sofort als bearbeitet.
- Fehlt die Quellrevision (`0`/leer), gilt der alte Stand als geändert. Lieber ein Fall zu viel zur Entscheidung als eine unbemerkt veraltete Kopie.
- Entscheidungen: „Alten Stand übernehmen“ (neue Revision, `change_summary = 'Übernahme aus altem Editor (V1-Revision N)'`, Audit `dashboard.rollout_v1_adopted`), „Pilot behalten“, „Später entscheiden“ (Audit `dashboard.rollout_decided`). Jede Entscheidung bindet V1- und V2-Revision. Weicht eine davon ab, zeigt die Ansicht „Entscheidung verfallen“.
- `dashboard_rollout_decisions` hat keinen direkten Client-Zugriff. Die Spalte `umgestellt_at` ergänzt 174.

## 9. Offene Entscheidungen für Marc (vor 174)

1. **Zwischenauftrag 173a** für B-1 (plus B-4, B-5) vor 174 bauen? Empfehlung: ja. 174 setzt eine Abnahmematrix ohne offene Befunde voraus.
2. Reihenfolge der Rollout-Stufen (Vorschlag 174 §0: Test-Organisation → ausgewählte Organisationen → alle).
3. Nutzer der Klasse `beide_geaendert` ohne Entscheidung: Vorschlag „Pilot behalten, alter Stand bleibt als Sicherung lesbar“ (173 §8).
4. Hosted-Migrationen §6 einspielen (Reihenfolge beachten).
