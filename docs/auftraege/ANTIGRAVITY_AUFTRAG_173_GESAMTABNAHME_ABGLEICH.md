# Auftrag 173 – Dashboard-Editor: Gesamtabnahme und Abgleich V1 ↔ V2 vor der Umstellung (P16a)

**Ziel:** Bevor irgendein Nutzer vom alten auf den neuen Editor umgestellt wird, wird der Gesamtstand P01–P15 einmal vollständig abgenommen (Funktion, Rechte, Last, Betrieb, Rückweg), und es gibt ein Werkzeug, das für jeden Nutzer zeigt, ob sich sein altes Dashboard (V1) seit dem Kopieren in den Pilot (V2) geändert hat. Abweichungen werden nicht automatisch übernommen, sondern zur Entscheidung vorgelegt. **Dieser Auftrag stellt niemanden um**; die Umstellung selbst ist 174.

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P16 (§6), §5.1 (keine unbemerkte Übernahme veralteter Kopien), §7 (alle Abnahmen), §8 (Rollout und Rückweg).
**Vorgelagert:** P01–P15 abgeschlossen (bis 172 gemergt). Fehlt ein Paket, nennt der Builder es im BUILD_LOG und Marc entscheidet, ob die Abnahme mit dokumentierter Einschränkung läuft (Masterplan §6.1: „Fähigkeiten dürfen datenabhängig deaktiviert bleiben, die Abnahme muss diese Einschränkung dokumentieren“).
**Baseline:** aktueller `main` beim Start.
**Branch:** `auftrag-173-gesamtabnahme`.
**Builder:** Claude Code (von Marc am 22.11.2026 beauftragt; ursprünglich Antigravity oder ein anderer benannter Agent). **Prüfer:** unabhängiger Agent nach `CLAUDE.md` §4.1, **zusätzlich** eine zweite unabhängige Prüfung der Abnahmematrix (anderer Agent als der erste Prüfer). **Merge:** Marc.
**Status:** FERTIGGESTELLT / PR ERSTELLT (22.11.2026), Baseline `c48ac8b1`. Ergebnis und Befunde: `docs/dashboard/GESAMTABNAHME_P16.md`.

---

## 1. Ist-Stand (geprüft auf `c138ce2e`; in T0 aktualisieren)

| Baustein         | Ist                                                                                                                                                                               | Fundstelle                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| V1-Speicher      | `executive_dashboard_preferences (organization_id, user_id, config, schema_version, revision, updated_at)`, PK je Nutzer und Organisation.                                        | `supabase/migrations/20261004_executive_dashboard_preferences.sql` |
| V2-Kopie         | Kopiermigration schreibt `metadata.migrated_from_v1 = true` und `metadata.last_migrated_revision` (V1-Revision zum Kopierzeitpunkt).                                              | `model/dashboardMigrationV1V2.ts:177–179`                          |
| Rollout-Schalter | `isDashboardEditorV2Enabled()`: Standard `false`; aktivierbar über `VITE_DASHBOARD_EDITOR_V2=true`, Session-Storage oder Override. **Kein** Schalter je Nutzer oder Organisation. | `model/dashboardRollout.ts`                                        |

## 2. Soll

### 2.1 Abgleich V1 ↔ V2

1. **Server-RPC** `dashboard_v1_v2_reconciliation()` (nur Admin, eigene Organisation): je Nutzer mit V1-Zeile: V1-Revision, `updated_at`, ob eine V2-Kopie existiert, deren `last_migrated_revision`, ob die V2-Kopie seit dem Kopieren bearbeitet wurde (V2-Revision > 1), Ergebnis-Klasse:
   - `gleich` (V1 unverändert seit Kopie, V2 beliebig),
   - `v1_geaendert` (V1-Revision > `last_migrated_revision`, V2 unbearbeitet),
   - `beide_geaendert` (V1 geändert **und** V2 bearbeitet),
   - `keine_kopie` (V1 vorhanden, V2 fehlt),
   - `nur_v2` (kein V1).
2. **Inhaltlicher Vergleich** für `v1_geaendert`/`beide_geaendert`: Die App übersetzt die aktuelle V1-Konfiguration mit `migrateV1ToV2` und vergleicht sie mit dem Diff aus 165 (`dashboardConfigDiff.ts`) gegen die V2-Kopie. Ergebnis als Liste („Kachel X neu in V1“, „Reihenfolge geändert“).
3. **Entscheidung je Nutzer** in einer Admin-Ansicht „Umstellung vorbereiten“ (nur Admin): „V1-Stand übernehmen (neue V2-Revision)“, „V2-Pilot behalten“, „später entscheiden“. Übernehmen erzeugt eine **neue Revision** (nie Überschreiben), `change_summary = 'Übernahme aus altem Editor (V1-Revision N)'`, aktualisiert `last_migrated_revision`, Audit-Eintrag. Ein erneuter Abgleich danach zeigt `gleich`.
4. **Keine stille Übernahme:** Ohne Entscheidung ändert sich nichts. Die Entscheidung wird in `dashboard_rollout_decisions` gespeichert und bindet zwingend die geprüften Revisionsstände ein: `(organization_id, user_id, ergebnis_klasse, entscheidung, v1_revision, v2_revision, entschieden_von_user_id, entschieden_at)`. Die Revisionsbindung dient als Schutz vor der erstmaligen Umstellung: Weicht vor dem Vollzug der Umstellung (174) die V1- oder V2-Revision ab (weil z. B. V1 nochmals bearbeitet wurde), verfällt die Freigabe und erfordert eine erneute Entscheidung. Nach vollzogener Umstellung (`umgestellt_at` in 174) ist der Wechsel fixiert; reguläre Folge-Bearbeitungen in V2 erhöhen die V2-Revision wie gewohnt und lösen keinen Rückfall auf V1 aus. Dies ist Voraussetzung für 174.

### 2.2 Gesamtabnahme

5. **Abnahmematrix** `docs/dashboard/GESAMTABNAHME_P16.md`: jede Zeile aus Masterplan §7 (beide Tabellen) mit Testfall, Nachweis (Test-Datei/Spec + Commit), Ergebnis, Einschränkung. Fehlende Nachweise werden in diesem Auftrag als Tests ergänzt, nicht nur beschrieben.
6. **Lasttest:** 24 gemischte Widgets, 10 Minuten wiederholtes Öffnen/Schließen, Messung geteilter Abfragen, Abo-Anzahl, Speichertrend, Renderzeit beim Ziehen; Server: 50 gleichzeitige Leser je Organisation auf `dashboard_crm_pipeline_overview` und `dashboard_time_series` (lokal, Skript `scripts/loadTestDashboardV2.mjs`). Zielwerte vor dem Lauf im BUILD_LOG festlegen (Masterplan §7: keine ungeprüften Versprechen).
7. **Rechte-Gesamtprüfung:** Matrix Viewer/Manager/Admin × persönlich/Team × lesen/schreiben/freigeben/Alarm/Import/Export/Kiosk über UI **und** direkten RPC-Aufruf; fremde Organisation; Rechteentzug während offener Sitzung.
8. **Betrieb:** Alarm-Not-Aus und Wiederanlauf, Lebenszeichen, Aufräumjob, Hosted-Migrationsstand (Liste der Migrationen, die Marc anwenden muss), `build:production`.
9. **Rückweg-Probe:** V2 für eine Testorganisation aktivieren, Änderungen machen, Schalter zurück: V1 zeigt seinen gesicherten Stand mit Hinweis auf den Datenstand; V2-Revisionen bleiben erhalten; erneutes Aktivieren verliert nichts (Masterplan §8).

### 2.3 Tests und Nachweise

10. pgTAP für RPC und Entscheidungstabelle (nur Admin, eigene Organisation, Klassen korrekt, Übernahme erzeugt Revision, kein Überschreiben); Vitest für Vergleich und Admin-Ansicht; E2E `e2e/dashboard-rollout-prep.spec.ts`; vollständige Playwright-Suite; Screenshots der Admin-Ansicht (`docs/screenshots/auftrag-173/README.md`).

### 2.4 Dokumentation

11. `GESAMTABNAHME_P16.md` (Matrix, Lastwerte, Einschränkungen, offene Entscheidungen), Masterplan §6 Nachtrag, `ARCHITECTURE_DECISIONS.md` Teil C, `BUILD_PLAN.md`, `docs/BUILD_LOG.md`.

## 3. Verbindliche Grenzen

Schutzbereiche unverändert; eine neue Migration (`dashboard_rollout_decisions`, RPC); V1-Tabelle wird **nur gelesen**; Rollout-Schalter unverändert (Änderung in 174); keine neuen Abhängigkeiten; `max-lines` 400; Tests zuerst (Klassen, Übernahme als neue Revision, Admin-only).

## 4. Ziel-Dateien

| Pfad                                                                                                                     | Änderung       |
| ------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_173_GESAMTABNAHME_ABGLEICH.md`                                                       | Dieser Auftrag |
| neu Migration `20261128_dashboard_rollout_reconciliation.sql`, neu `supabase/tests/dashboard_rollout_reconciliation.sql` | Server         |
| neu Admin-Ansicht „Umstellung vorbereiten“ (Muster Admin-Bereich), Service/Hook                                          | Oberfläche     |
| ergänzende Tests für Matrix-Lücken, neu `scripts/loadTestDashboardV2.mjs`, E2E, Screenshots                              | Nachweise      |
| neu `docs/dashboard/GESAMTABNAHME_P16.md`, Masterplan, `ARCHITECTURE_DECISIONS.md`, `BUILD_PLAN.md`, `docs/BUILD_LOG.md` | Doku           |

## 5. Tasks

- [x] **T0** Baseline, Paketstand P01–P15 je Paket mit Auftrag/PR, Hosted-Migrationsliste.
- [x] **T1** Rot-Nachweise (Klassen, Übernahme).
- [x] **T2** RPC, Entscheidungstabelle, pgTAP.
- [x] **T3** Admin-Ansicht und Vergleich.
- [x] **T4** Abnahmematrix mit fehlenden Tests, Rechte-Gesamtprüfung.
- [x] **T5** Lasttest, Betrieb, Rückweg-Probe.
- [x] **T6** Doku, Pflicht-Verifikation, BUILD_LOG, PR. Review durch zwei unabhängige Prüfer steht aus.

## 6. Abnahme

- Für jeden Nutzer ist sichtbar, ob V1 und V2 auseinanderlaufen; nichts wird ohne Entscheidung übernommen; Übernahme erzeugt eine neue Revision.
- Jede Abnahmezeile aus Masterplan §7 hat einen Nachweis oder eine dokumentierte Einschränkung.
- Last-, Rechte-, Betriebs- und Rückweg-Prüfung mit Messwerten belegt.

## 7. Pflicht-Verifikation

```
npx tsc --noEmit && npm run lint && npm run format:check && npm test && npm run verify && npm run build && npm run build:production && npx size-limit
supabase db reset --yes && supabase test db && npm run verify:migrations && npm run verify:realtime -- --fail-if-offline
npx playwright test
git diff <baseline> -- src/simulation src/types src/context src/services/data src/features/resources   # leer
```

## 8. Entscheidungen Marc vor 174

- Reihenfolge der Rollout-Stufen (Vorschlag in 174 §0).
- Umgang mit Nutzern der Klasse `beide_geaendert` ohne Entscheidung: Vorschlag „V2-Pilot behalten, V1 bleibt als Sicherung lesbar“.
