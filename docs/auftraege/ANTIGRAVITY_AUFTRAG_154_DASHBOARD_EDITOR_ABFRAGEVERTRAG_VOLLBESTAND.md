# Auftrag 154 – Dashboard-Editor: Abfragevertrag und Vollbestandsaggregation (P08a)

**Ziel:** Jede Kachel des V2-Editors hat genau eine Abfrage (`tile.query`). Diese Abfrage wird gegen die tatsächlichen Fähigkeiten ihrer Kennzahl geprüft, im Browser und auf dem Server. CRM-Kennzahlen werten nachweislich den vollständigen berechtigten Datenbestand aus, auch bei mehr als 1.000 Deals. Damit steht der fachliche Unterbau, auf dem Auftrag 155 (P08b) den Panel-Editor mit Baukasten, Vorschau und Rohdateninspektor baut.

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P08 sowie §3.2, §4.B, §4.E und §5. Plananpassung vom 13.11.2026: P08 wird geteilt (siehe §9 dieses Auftrags).
**Vorgelagert:** 151 (P06b, PR #177), 152 (PR #178), 153 (PR #179, Härtung PR #180). Alle gemergt, P08 ist damit freigegeben.
**Nachgelagert:** Auftrag 155 (P08b) mit der Oberfläche des Panel-Editors.
**Baseline:** `main`, Commit `84bbc91` (nach Merge von PR #180).
**Branch:** `auftrag-154-abfragevertrag-vollbestand` (enthält diesen Auftrag; der Builder baut darauf weiter).
**Builder:** Antigravity. **Prüfer:** Codex auf GitHub (oder ein anderer Agent, der nicht gebaut hat) gemäß `CLAUDE.md` §4.1. **Merge:** Marc.
**Status:** GEPLANT, noch nicht gebaut.

---

## 1. Ist-Stand (Baseline `84bbc91`), am Code geprüft

| Baustein                         | Ist                                                                                                                                                                                                                                                                                                                                                    | Fundstelle                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Zwei Abfragequellen je Kachel    | V2-Kachel hat `query` (`metricId`, `pipelineId`, `timeframe`, `aggregation`, `groupBy[]`, `filters`) **und** daneben `pipelineOverride`, `timeframeOverride`, `aggregationOverride`.                                                                                                                                                                   | `src/features/dashboard/model/dashboardConfigV2.ts:39–70`                                                                    |
| Migration schreibt beide         | Die V1→V2-Kopie füllt Overrides und `query` gleichzeitig. `query.pipelineId` enthält dabei schon die globale Pipeline, ist also kein Override mehr.                                                                                                                                                                                                    | `model/dashboardMigrationV1V2.ts:121–147`                                                                                    |
| Canvas liest nur Overrides       | `convertV2TileToV1` ignoriert `tile.query` vollständig; `_globalTimeframe` wird nicht benutzt.                                                                                                                                                                                                                                                         | `components/editor/canvas/CanvasTileCard.tsx:50–66`                                                                          |
| Inspector schreibt nur Overrides | Pipeline und Zeitraum landen in `pipelineOverride` / `timeframeOverride`.                                                                                                                                                                                                                                                                              | `components/editor/inspector/InspectorTabs.tsx:155–200`                                                                      |
| Client-Prüfung                   | `validateDashboardConfigV2` prüft Layout und Felder, nicht den Inhalt von `query`.                                                                                                                                                                                                                                                                     | `model/dashboardConfigV2.ts`                                                                                                 |
| Server-Prüfung                   | `dashboard_config_v2_invalid_reason` erlaubt den Schlüssel `query`, prüft seinen Inhalt aber nicht. Beliebiges JSON bis 64 KiB wird gespeichert.                                                                                                                                                                                                       | `supabase/migrations/20261113_dashboard_v2_storage_and_revisions.sql:236–245`                                                |
| **CRM-Abruf abgeschnitten**      | `CRMRepository.getImportedFunnelDeals` → `readSupabaseTable` mit `select('*').order(...)` ohne `range`. Supabase liefert höchstens `max_rows = 1000` Zeilen. Ab dem 1.001. Deal rechnet das Dashboard **still** nur mit den ersten 1.000 (nach `close_date` absteigend). Die Fähigkeitsmatrix behauptet „Vollbestand“; das stimmt nur bis 1.000 Deals. | `src/services/db/crmRepository.ts:76–93, 148–164`; `supabase/config.toml:18`; `docs/dashboard/KPI_FAEHIGKEITEN_144.md:70–75` |
| Pipeline-Filter im Browser       | Alle Deals werden geladen, danach filtert `FilteredFunnelDealSource` im Browser.                                                                                                                                                                                                                                                                       | `data/resolveCrm.ts:17–31`                                                                                                   |
| Fachberechnung                   | `getPipelineOverview`: Stufe = `stage.trim()`, gewonnen = enthält „gewonnen“, offen = weder „gewonnen“ noch „verloren“, Stufen nach Volumen absteigend. Bei gleichem Volumen hängt die Reihenfolge von der Ladereihenfolge ab (nicht deterministisch).                                                                                                 | `src/domain/executiveCockpitData.ts:213–273`                                                                                 |
| Cache-Schlüssel                  | `['dashboard', organizationId, 'crm', 'pipelineOverview', pipeline]`, ohne Nutzerbezug.                                                                                                                                                                                                                                                                | `data/dashboardQueryKeys.ts`                                                                                                 |
| Tatsächliche Fähigkeiten         | 48 aktive Einträge: 24 Baseline, 6 CRM, 13 Live, 5 Kombination. Einziger Filter ist `pipeline` (`CatalogFilter`), einzige Gruppierung ist die Stufe (zwei CRM-Einträge). CRM hat kein belegtes Datumsfeld für Zeiträume (`closeDate` nicht belegt). Baseline/Kombination sind feste Stände.                                                            | `model/dashboardCatalog.ts:64`; `KPI_FAEHIGKEITEN_144.md` §1–2                                                               |
| Abweichung im P02-Vertrag        | `EDITOR_UX_FACHVERTRAEGE_145.md` §3.2 nennt „144 aktive Katalog-IDs“ und Filter/Gruppierungen wie Region, Segment, Kanal. Die gibt es nicht. §9 skizziert `filters: TileFilterRule[]` und `transformations`; gespeichert ist seit P07 die Form aus `dashboardConfigV2.ts`.                                                                             | `docs/dashboard/EDITOR_UX_FACHVERTRAEGE_145.md:139–145, 380–410`                                                             |

## 2. Soll

### 2.1 Eine Abfrage je Kachel

1. `tile.query` ist die einzige Quelle für Kennzahl, Aggregation, Pipeline, Gruppierung und Zeitbezug. Die Form bleibt die gespeicherte Form aus `dashboardConfigV2.ts` (keine neue Schema-Version), mit verbindlicher Bedeutung:
   - `metricId` – Pflicht, identisch mit `catalogId`.
   - `aggregation` – optional, nur ein Wert aus den Fähigkeiten der Kennzahl (2.2).
   - `pipelineId` – **fehlt:** erbt die Dashboard-Pipeline. **String:** feste Pipeline. **`null`:** ausdrücklich alle Pipelines, auch wenn das Dashboard eine Pipeline setzt.
   - `groupBy` – fehlt oder `['stage']`, nur bei Kennzahlen mit dieser Gruppierung.
   - `timeframe` – fehlt oder genau der Zeitbezug der Kennzahl (`fest`, `aktuell`, `live`). Ein frei wählbarer Zeitraum ist in P08a für keine Kennzahl zulässig, weil keine Quelle ein belegtes Datumsfeld hat. Zeitfenster kommen mit P10.
   - `filters` – fehlt oder leeres Objekt. Reserviert für spätere, belegte Filterfelder.
2. Die Felder `pipelineOverride`, `timeframeOverride` und `aggregationOverride` werden nur noch **gelesen**, um alte Stände zu normalisieren, und nie mehr geschrieben.
3. Neue reine Funktion `normalizeTileQuery(tile, dashboard)`: deterministisch, idempotent. Vorrang: `query`-Feld vorhanden → gilt; sonst Override; sonst erben. Ein Legacy-`timeframe` (etwa `2025-01-01/2025-12-31` aus V1 oder der globale Wert aus der Migration) wird verworfen und als Hinweis gemeldet, nicht stillschweigend umgedeutet. Ein `query.pipelineId`, das die P07-Migration nur aus der globalen Pipeline übernommen hat, wird als „erben“ normalisiert. Erkennbar ist das am fehlenden `pipelineOverride` und an `metadata.migrated_from_v1`.
4. Laden normalisiert, Speichern schreibt nur die kanonische Form. Canvas (`convertV2TileToV1` bzw. ein Nachfolger), Detailansicht und Datenauflösung lesen ausschließlich die normalisierte Abfrage.
5. Der Inspector-Tab „Daten & Filter“ schreibt in `query` (über die bestehenden Editor-Befehle, eine Änderung = ein Undo-Schritt). Nicht unterstützte Optionen sind deaktiviert, der Grund steht sichtbar daneben (z. B. „Feste Stammdaten, kein Pipeline-Filter“). Darüber hinaus keine neue Oberfläche; der Panel-Editor folgt in 155.

### 2.2 Fähigkeiten aus dem Katalog ableiten

6. Neue Datei `model/queryCapabilities.ts`: `getQueryCapabilities(entry)` leitet aus vorhandenen Katalogfeldern ab (`source.layer`, `shape`, `aggregation`, `filters`, `timeMode`, `views`), welche Aggregationen, Filter, Gruppierungen, Zeitbezüge und Darstellungen erlaubt sind. Keine zweite, von Hand gepflegte Liste.
7. Zulässige Aggregationen folgen der Fachregel: Bestand → `letzter_stand`; Fluss → `summe`; Verhältnis → `verhaeltnis`; `keine` → keine Auswahl. Ein Bestand wird nie über die Zeit aufsummiert.
8. Ein Tabellentest prüft alle 48 aktiven Einträge gegen die Fähigkeitsmatrix aus `KPI_FAEHIGKEITEN_144.md`. Abweichungen werden begründet: entweder Matrix per datiertem Nachtrag korrigieren oder Ableitung anpassen.

### 2.3 Prüfung im Browser und auf dem Server

9. `validateTileQuery(query, entry)` liefert typisierte Fehlercodes: `metrik_abweichend`, `aggregation_unzulaessig`, `filter_unzulaessig`, `gruppierung_unzulaessig`, `zeitraum_unzulaessig`, `unbekanntes_feld`, `typ_ungueltig`. Eingebunden in den Speicherpfad (`dashboardLayoutIntegrity.ts` / `validateDashboardConfigV2`): Eine ungültige Abfrage wird nicht gespeichert, die Meldung nennt Kachel und Grund.
10. Neue Migration erweitert `dashboard_config_v2_invalid_reason` (`CREATE OR REPLACE`) um eine **Strukturprüfung** von `query`: nur die Schlüssel aus 2.1; `metricId` ist String und gleich `catalogId`; `aggregation`/`timeframe` sind Strings mit höchstens 64 Zeichen; `pipelineId` ist String (≤ 120 Zeichen) oder `null`; `groupBy` ist ein Array mit höchstens einem Element `stage`; `filters` ist ein leeres Objekt. Die **Fachprüfung** (welche Kennzahl was darf) bleibt im Browser und im Aggregat-RPC, weil der Katalog im TypeScript-Code liegt. Diese Grenze steht ausdrücklich in der Spezifikation.
11. Die Server-Prüfung lässt alte Revisionen aus P07 zu: Legacy-`timeframe`-Werte sind nur strukturell begrenzt, nicht fachlich. `restore_dashboard_revision_v2` auf eine P07-Revision funktioniert weiter (SQL-Test).
12. Paritätstest Struktur: dieselben Fixture-Konfigurationen (gültig, und je Fehlercode mindestens eine ungültige) laufen durch Client-Validator und SQL-Funktion; beide urteilen gleich (gültig/ungültig). Die Fixtures liegen einmal im Repo und werden von beiden Tests gelesen.

### 2.4 Vollbestand für CRM-Kennzahlen

13. Neue RPC `public.dashboard_crm_pipeline_overview(p_pipeline TEXT DEFAULT NULL) RETURNS JSONB`, `SECURITY INVOKER`, `STABLE`, `search_path` fest gesetzt:
    - Ohne aktive Mitgliedschaft (`current_organization_id() IS NULL OR NOT is_active_member()`): Fehler mit `ERRCODE '42501'`, Meldung `LP_NOT_MEMBER`.
    - Rechnet über **alle** Deals, die RLS dem Aufrufer zeigt. Kein Zeilenlimit, keine Seitenbildung.
    - Liefert `{ totalDeals, totalVolume, wonVolume, openVolume, stages: [{ stage, count, volume, sharePercent }], evaluatedDeals, pipeline, asOf }`. `evaluatedDeals` = Zahl der ausgewerteten Zeilen (für den Rohdateninspektor in 155), `asOf` = Serverzeit der Auswertung.
    - Fachlich identisch mit `getPipelineOverview`: `btrim(stage)`, Klassifizierung über `lower(...) LIKE '%gewonnen%'` bzw. `'%verloren%'`, `amount` NULL → 0 (wie `parseFloat(...) || 0` im Repository), `sharePercent = round(volume / totalVolume * 100)` (0 bei Gesamtvolumen 0), exakter Pipeline-Vergleich.
    - Ungültige Zeilen (negativer Betrag, leere Stufe): Fehler `ERRCODE '22023'`, Meldung `LP_CRM_INVALID_DEAL`. Der Client zeigt dafür denselben Zustand `fehler` wie heute.
    - `EXECUTE` nur für `authenticated` (und `service_role`); `REVOKE` von `PUBLIC` und `anon`.
14. Deterministische Stufenreihenfolge auf **beiden** Seiten: Volumen absteigend, dann Anzahl absteigend, dann Stufenname aufsteigend (Byte-Reihenfolge, SQL `COLLATE "C"`). `getPipelineOverview` erhält denselben Tie-Break (Änderung an `src/domain/executiveCockpitData.ts` ist freigegeben, nur die Sortierung, mit Test).
15. Neue Datei `data/crmAggregateSource.ts`: Ist Supabase konfiguriert, holt der Dashboard-CRM-Pfad die Übersicht per RPC. Ist Supabase nicht konfiguriert (Demo-/Offline-Snapshot ohne Zeilenlimit), rechnet er wie bisher im Browser über `getPipelineOverview`. `crmRepository.ts` bleibt unverändert.
16. Cache: neuer Schlüssel `dashboardQueryKeys.crmOverview(organizationId, userId, pipeline | null)`. Kacheln mit gleicher effektiver Abfrage teilen einen Abruf: 24 CRM-Kacheln über drei verschiedene Pipelines ergeben genau drei RPC-Aufrufe (Test). Abmelden, Nutzerwechsel und Organisationswechsel entfernen die Einträge; danach ist kein alter Wert sichtbar (Test).
17. **Paritätstest Fachberechnung:** gemeinsame Fixtures (mindestens: leer; eine Pipeline; mehrere Pipelines; gleiche Volumen in zwei Stufen; Stufen mit Leerzeichen und Groß-/Kleinschreibung; gewonnen, verloren, offen; Betrag `NULL`; Cent-Beträge; **1.500 Deals**). Für jeden Fixture-Fall liefern `getPipelineOverview` (Browser) und die RPC (lokale Supabase) dieselben Zählwerte und dieselbe Stufenreihenfolge. Volumen sind nach Rundung auf zwei Nachkommastellen gleich. Der 1.500-Deal-Fall belegt zusätzlich, dass der alte Repository-Pfad hier nur 1.000 Zeilen sieht: Rot-Nachweis vor der Umstellung, im BUILD_LOG.
18. Last: `EXPLAIN (ANALYZE, BUFFERS)` der RPC mit 5.000 synthetischen Deals in einer Organisation, mit und ohne Pipeline. Ergebnis im BUILD_LOG. Der vorhandene Index `(organization_id, pipeline, id)` aus `20260928_crm_query_indexes.sql` wird genutzt; ein neuer Index nur mit Messbeleg.

### 2.5 Dokumentation

19. Neue Spezifikation `docs/dashboard/ABFRAGEVERTRAG_P08A.md`: Bedeutung jedes Abfragefelds, Erbregeln, Normalisierung alter Stände, Fähigkeitsableitung, Fehlercodes, Grenze Struktur- vs. Fachprüfung, RPC-Vertrag mit Paritätsregeln, Cache-Schlüssel, und was ausdrücklich fehlt (Zeitfenster → P10, weitere Filter/Transformationen → P14, Alarmfähigkeit → P13).
20. Datierte Nachträge (nichts umschreiben): `KPI_FAEHIGKEITEN_144.md` (Vollbestand galt bis 1.000 Deals; seit 154 per RPC), `EDITOR_UX_FACHVERTRAEGE_145.md` (48 statt 144 aktive IDs; Filter/Gruppierungen nur laut Katalog; gespeicherte Abfrageform laut P08a), Masterplan §6 (P08-Teilung).

## 3. Verbindliche Grenzen

1. **Schutzbereiche:** `src/simulation/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**` bleiben unberührt (Diff leer). **Ausdrücklich freigegeben** ist in `src/types/**` nur `src/types/database.generated.ts`, und nur für die neue RPC-Signatur. Der Diff gehört in den BUILD_LOG.
2. **`crmRepository.ts` bleibt unverändert**, Lese- und Schreibpfade. Andere Ansichten, die `getImportedFunnelDeals` nutzen, sind nicht Teil dieses Auftrags (siehe §8).
3. **Genau eine neue Migration** `supabase/migrations/20261116_dashboard_query_contract.sql`, idempotent (`CREATE OR REPLACE`, `IF NOT EXISTS`). Bestehende Migrationen werden nicht verändert. `scripts/verifyMigrationUpgrade.mjs` bleibt grün, Fixtures unverändert.
4. **Keine neue Schema-Version.** `version` bleibt 2; alte V2-Revisionen bleiben lad- und wiederherstellbar.
5. **V1-Pfad unverändert.** Der alte Editor (`executive_dashboard_preferences`, `PersonalExecutiveDashboard`) rechnet weiter wie bisher. Ob er die RPC ebenfalls nutzt, entscheidet ein späterer Auftrag. Ausnahme: der Tie-Break aus 2.4 Nr. 14 wirkt dort mit.
6. **Keine neuen Abhängigkeiten**, kein Code-Editor-Paket. Der deklarative Modus ist Teil von 155.
7. **`max-lines` 400** je Datei. `InspectorTabs.tsx` hat 336 Zeilen; neue Logik kommt in eigene Dateien.
8. **Tests zuerst** (rot vor grün), Rot-Läufe im BUILD_LOG: Abschneiden bei 1.500 Deals, Canvas ignoriert `query`, Server speichert beliebiges `query`-JSON.
9. **Keine Änderung an Hosted-Supabase** durch den Builder. Für Marc steht eine Schrittliste im BUILD_LOG (Migration anwenden; danach prüfen, dass ein Mitglied der Demo-Organisation Werte sieht und ein abgemeldeter Aufruf `42501` bzw. `permission denied` erhält).

## 4. Ziel-Dateien

| Pfad                                                                                                                                       | Änderung                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_154_DASHBOARD_EDITOR_ABFRAGEVERTRAG_VOLLBESTAND.md`                                                    | Dieser Auftrag (Checkboxen abhaken, Status)                                                                                                                                 |
| `docs/dashboard/ABFRAGEVERTRAG_P08A.md`                                                                                                    | Neu: Spezifikation (2.5 Nr. 19)                                                                                                                                             |
| `supabase/migrations/20261116_dashboard_query_contract.sql`                                                                                | Neu: Strukturprüfung `query`, RPC `dashboard_crm_pipeline_overview`, Grants                                                                                                 |
| `supabase/tests/dashboard_query_contract.sql`                                                                                              | Neu: Strukturprüfung, Restore einer P07-Revision, RPC-Rechte (`anon`, Nichtmitglied, deaktivierte Mitgliedschaft, fremde Organisation), Fehlercodes, 1.500-Deal-Vollbestand |
| `supabase/tests/fixtures/dashboard_query_parity/**`                                                                                        | Neu: gemeinsame Fixtures für Struktur- und Fachparität (JSON)                                                                                                               |
| `supabase/seed.sql`                                                                                                                        | Nur falls die Paritätsfälle Seed-Daten in Organisation A/B brauchen; keine echten Daten                                                                                     |
| `src/features/dashboard/model/dashboardConfigV2.ts`                                                                                        | Kommentierte Feldbedeutung; `pipelineId: string \| null`; Abfrageprüfung einhängen                                                                                          |
| `src/features/dashboard/model/tileQuery.ts`                                                                                                | Neu: `normalizeTileQuery`, `validateTileQuery`, Fehlercodes                                                                                                                 |
| `src/features/dashboard/model/queryCapabilities.ts`                                                                                        | Neu: `getQueryCapabilities`                                                                                                                                                 |
| `src/features/dashboard/model/dashboardMigrationV1V2.ts`                                                                                   | Schreibt künftig nur die kanonische Abfrage (keine Overrides, kein globaler Wert in `query.pipelineId`)                                                                     |
| `src/features/dashboard/services/dashboardLayoutIntegrity.ts`                                                                              | Abfrage beim Speichern normalisieren und prüfen                                                                                                                             |
| `src/features/dashboard/components/editor/canvas/CanvasTileCard.tsx`                                                                       | Liest die normalisierte Abfrage                                                                                                                                             |
| `src/features/dashboard/components/editor/inspector/InspectorTabs.tsx`                                                                     | Daten-Tab schreibt `query`; Gründe für gesperrte Optionen                                                                                                                   |
| `src/features/dashboard/components/editor/useTileInspectorActions.ts`, `core/editorCommands.ts`                                            | Nur falls ein Befehl zum Setzen der Abfrage fehlt (eine Änderung = ein Undo-Schritt)                                                                                        |
| `src/features/dashboard/data/crmAggregateSource.ts`                                                                                        | Neu: RPC-Pfad und Fallback                                                                                                                                                  |
| `src/features/dashboard/data/dashboardQueryKeys.ts`                                                                                        | Schlüssel `crmOverview` mit Nutzerbezug                                                                                                                                     |
| `src/features/dashboard/hooks/useDashboardData.ts`                                                                                         | CRM-Zweig über `crmAggregateSource`; Cache-Bereinigung bei Sitzungs-/Organisationswechsel, falls noch nicht zentral vorhanden                                               |
| `src/domain/executiveCockpitData.ts`                                                                                                       | Nur Tie-Break der Stufensortierung (2.4 Nr. 14)                                                                                                                             |
| `src/types/database.generated.ts`                                                                                                          | **Schutzbereich, ausdrücklich freigegeben:** nur die neue RPC                                                                                                               |
| `src/features/dashboard/__tests__/tileQuery.vitest.ts`                                                                                     | Neu: Normalisierung (alle Legacy-Formen aus P07), Prüfung, Fehlercodes                                                                                                      |
| `src/features/dashboard/__tests__/queryCapabilities.vitest.ts`                                                                             | Neu: Tabellentest über 48 aktive Einträge                                                                                                                                   |
| `src/features/dashboard/__tests__/crmAggregateSource.vitest.ts`                                                                            | Neu: RPC-/Fallback-Pfad, geteilte Abrufe, Cache-Bereinigung, Fehlerabbildung                                                                                                |
| `src/features/dashboard/__tests__/dashboardQueryParity.vitest.ts`                                                                          | Neu: Browser-Hälfte der Paritätstests (liest die gemeinsamen Fixtures)                                                                                                      |
| bestehende Tests unter `src/features/dashboard/__tests__/`                                                                                 | Erwartungen anpassen, wo sie Overrides voraussetzen; nicht löschen                                                                                                          |
| `docs/dashboard/KPI_FAEHIGKEITEN_144.md`, `docs/dashboard/EDITOR_UX_FACHVERTRAEGE_145.md`, `docs/dashboard/DASHBOARD_EDITOR_MASTERPLAN.md` | Datierte Nachträge (2.5 Nr. 20)                                                                                                                                             |
| `BUILD_PLAN.md`, `docs/BUILD_LOG.md`                                                                                                       | Status, Builder-Eintrag, Prüfnachweis                                                                                                                                       |

Bei Bedarf außerhalb dieser Liste: stoppen und im PR begründen (`CLAUDE.md` §5.3).

## 5. Tasks

Reihenfolge je Block: Tests zuerst, dann Umsetzung.

- [x] **T0 Einstieg:** Branch `auftrag-154-abfragevertrag-vollbestand` auschecken, auf aktuellen `main` rebasen, falls nötig. Masterplan P08, `EDITOR_UX_FACHVERTRAEGE_145.md` §3 und §9, `KPI_FAEHIGKEITEN_144.md` und diesen Auftrag lesen. Baseline-Diff der Schutzbereiche notieren.
- [x] **T1 Rot-Nachweise:** (a) Vitest: 1.500 Deals über einen Supabase-Mock mit 1.000-Zeilen-Grenze ergeben heute `totalDeals = 1000`. (b) Vitest: Kachel mit `query.pipelineId = 'B'` und ohne Override zeigt im Canvas Pipeline-A-Werte bzw. die globale Pipeline. (c) SQL: `save_dashboard_v2` mit `query: {"x": "y"}` wird angenommen. Ergebnisse festhalten.
- [x] **T2 Fähigkeiten:** `queryCapabilities.ts` mit Tabellentest über alle 48 aktiven Einträge (2.2).
- [x] **T3 Abfragevertrag:** `tileQuery.ts` mit Normalisierung und Prüfung; Tests für jede Legacy-Form aus P07 (Override gesetzt/nicht gesetzt, `query.pipelineId` = global, `timeframe` als Zeitraum, als globaler Wert, fehlend) und jeden Fehlercode. Idempotenz: `normalize(normalize(x)) = normalize(x)`.
- [x] **T4 Speicher- und Lesepfad:** Integrität beim Speichern, Migration schreibt kanonisch, Canvas und Datenauflösung lesen normalisiert, Inspector schreibt `query` mit sichtbaren Sperrgründen. T1 (b) grün. Ein Undo nimmt eine Abfrageänderung vollständig zurück.
- [x] **T5 Server-Struktur:** Migration Teil 1 (Strukturprüfung); SQL-Tests inklusive Restore einer P07-Revision; Strukturparität über die gemeinsamen Fixtures. T1 (c) grün.
- [x] **T6 Aggregat-RPC:** Migration Teil 2 mit Rechten; SQL-Tests (Nichtmitglied, deaktiviert, fremde Organisation, `anon`, `LP_CRM_INVALID_DEAL`, 1.500 Deals vollständig).
- [x] **T7 Client-Datenpfad:** `crmAggregateSource.ts`, Query-Schlüssel, Hook, Tie-Break in `getPipelineOverview`. Tests: geteilte Abrufe (24 Kacheln, 3 Pipelines → 3 Aufrufe), Cache-Bereinigung, Fallback ohne Supabase, Fehlerabbildung. T1 (a) grün.
- [x] **T8 Fachparität und Last:** gemeinsame Fixtures in Browser und lokaler Supabase; `EXPLAIN (ANALYZE, BUFFERS)` mit 5.000 Deals.
- [x] **T9 Typen:** `database.generated.ts` um die RPC ergänzen bzw. neu generieren; Diff im BUILD_LOG.
- [x] **T10 Doku:** Spezifikation und Nachträge (2.5).
- [x] **T11 Abschluss:** Pflicht-Verifikation (§7), Screenshot-Matrix für den Inspector-Daten-Tab (gesperrte Optionen mit Grund; 1440/768/375, nur README committen), Schutzbereichs-Diff, BUILD_LOG-Builder-Eintrag mit Schrittliste für Marc, PR öffnen, Review anfordern.

## 6. Abnahme

- Jede V2-Kachel hat genau eine wirksame Abfrage; Canvas, Detailansicht und Datenauflösung lesen sie. Overrides werden nicht mehr geschrieben, alte Stände werden deterministisch normalisiert.
- Eine Abfrage, die die Kennzahl fachlich nicht trägt, wird im Browser abgewiesen und nicht gespeichert. Eine strukturell ungültige Abfrage weist auch der Server ab. Revisionen aus P07 bleiben wiederherstellbar.
- CRM-Kennzahlen im V2-Editor werten bei 1.500 Deals alle 1.500 aus (Browser und SQL belegt). Pipeline-Filter wirkt auf dem Server.
- Browser und RPC liefern für alle Paritäts-Fixtures dieselben Werte und dieselbe Stufenreihenfolge.
- Gleiche Abfragen teilen einen Abruf; nach Abmelden oder Organisationswechsel ist kein alter Wert sichtbar.
- `anon`, Nichtmitglieder, deaktivierte Mitglieder und fremde Organisationen erhalten keine Aggregate.
- Schutzbereichs-Diff leer außer `src/types/database.generated.ts` im beschriebenen Umfang; keine neuen Abhängigkeiten; V1-Editor unverändert bis auf den Tie-Break.

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
node scripts/verifyMigrationUpgrade.mjs
git diff 84bbc91 -- src/simulation src/context src/services/data src/features/resources   # muss leer sein
git diff 84bbc91 -- src/types                                                             # nur database.generated.ts, im BUILD_LOG gezeigt
git diff 84bbc91 -- src/services/db/crmRepository.ts                                      # muss leer sein
```

Zusätzlich: SQL-Tests unter `supabase/tests/` gegen die lokale Supabase-Instanz (wie in 150, 152, 153), CI-Checks `lint`, `typecheck`, `test`, `build`, `livekpi-verifiers`, `size-limit`, `e2e` grün.

## 8. Offene Punkte und Risiken

- **Weitere Ansichten mit 1.000-Zeilen-Grenze:** Andere Stellen, die `getImportedFunnelDeals`, `getCompanies` oder `getContacts` ohne `range` nutzen (Executive Cockpit, V1-Dashboard, Exporte), haben dasselbe Abschneide-Risiko. Der Builder listet sie im BUILD_LOG auf (nur Fundstellen, keine Änderung). Marc entscheidet über einen eigenen Auftrag.
- **Zahlengenauigkeit:** `amount` ist in der Datenbank `numeric`, im Browser `float`. Parität gilt deshalb nach Rundung auf Cent. Zeigt ein Fixture eine Abweichung über einen Cent, ist das ein Befund und keine Toleranzfrage.
- **Server-Parität der Layoutprüfung (offen aus 151):** nicht Teil dieses Auftrags. Die Strukturparität aus 2.3 Nr. 12 gilt nur für `query`.
- **Nicht Teil dieses Auftrags:** Panel-Editor-Oberfläche, visueller Baukasten, deklarativer Modus, Vorschau, Rohdateninspektor (alles 155); Zeitfenster (P10); weitere Filter, Transformationen und Joins (P14); Alarmfähigkeit (P13).

## 9. Plananpassung: Teilung von P08

Masterplan §6 verlangt, größere Pakete vor der Umsetzung zu teilen. P08 umfasst Abfragevertrag, Serverprüfung, Vollbestandsaggregation und eine komplette neue Oberfläche. Das wäre ein PR, den niemand gründlich prüfen kann. Deshalb:

- **154 = P08a:** Abfragevertrag, Fähigkeiten, Prüfung im Browser und auf dem Server, Vollbestands-RPC, geteilter Cache. Ohne neue Oberfläche.
- **155 = P08b:** Panel-Editor (Vollfläche, lazy geladen): Kopf mit Übernehmen/Abbrechen, Vorschau mit denselben Renderern, visueller Baukasten (Kennzahl → Aggregation → Filter → Gruppierung → Zeitbezug → Darstellung, nur Optionen laut `getQueryCapabilities`), deklarativer Modus als validiertes JSON mit verlustfreiem Wechsel, Rohdateninspektor (Aggregatzeilen plus `evaluatedDeals`/`asOf`), Übernehmen als ein Undo-Schritt, Abbrechen ohne Entwurfsänderung. Der Detailauftrag wird nach dem Merge von 154 geschrieben.

Die Abnahme von P08 im Masterplan („Queries entsprechen der Fachberechnung; Filter/Vollbestandsaggregation belegt; Zwischenstand A nur als Pilot auf V2-Kopien“) ist erst mit 155 vollständig erfüllt.
