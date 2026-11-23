# Auftrag 173a – Zwischenauftrag: Alarm-Rechte an das Dashboard-Recht binden (Befunde B-1, B-4, B-5)

**Ziel:** Die offenen Befunde aus der Gesamtabnahme (Auftrag 173, `docs/dashboard/GESAMTABNAHME_P16.md` §5) schließen, damit Auftrag 174 auf einer Abnahmematrix ohne offene Befunde aufsetzt (174 „Vorgelagert“).
**Entscheidung Marc:** 23.11.2026 („ja machen wir genau so“): 173a vor 174; Rollout-Stufen nach Vorschlag 174 §0; Nutzer der Klasse `beide_geaendert` ohne Entscheidung: „Pilot behalten, V1 bleibt als Sicherung lesbar“.
**Vorgelagert:** 173 (PR #219, gemergt nach `main`). Dieser Auftrag setzt auf `main` auf (PR #220).
**Baseline:** `9f8fc827` (Merge PR #219 auf `main`).
**Branch:** `auftrag-173a-alarm-rechte`.
**Builder:** Claude Code. **Prüfer:** Codex (CLAUDE.md §4.1, Review ohne Befunde). **Merge:** Marc.
**Status:** FERTIGGESTELLT / PR #220 AKTUALISIERT (bereit für Merge).

---

## 1. Ist-Stand (Befunde aus 173)

| Nr. | Befund | Fundstelle |
| --- | --- | --- |
| B-1 | `create_dashboard_alarm_rule`, `update_…`, `pause_…`, `resume_…`, `delete_…` prüfen nur „Admin/Manager der Organisation des Dashboards“, nicht das Recht am Dashboard. `create` überschreibt per `ON CONFLICT (dashboard_id, tile_id)` eine bestehende fremde Regel und setzt den Aufrufer als Verantwortlichen. `list_dashboard_alarm_rules` und `list_dashboard_alarm_events` (alt, ungenutzt, aber freigegeben) zeigen jedem Mitglied die Daten jedes Dashboards der Organisation. | `20261124_dashboard_alarms.sql`, `20261125_dashboard_alarm_receipts.sql` |
| B-4 | `alarm_worker_status().aktiveRegeln` zählt Regeln aller Organisationen. | `20261124_dashboard_alarms.sql` |
| B-5 | `e2e/team-dashboards.spec.ts` räumt mit nicht vorhandenen Tabellennamen (`dashboards_v2`, `dashboard_teams_v2`) auf; Fehler werden verschluckt. | `e2e/team-dashboards.spec.ts` |

Die Ereignis-RPCs aus 168 (`list_dashboard_alarm_events_v2`, `count_unread_…`, `mark_…_read`, `acknowledge_…`) prüfen das Leserecht bereits korrekt; `takeover_dashboard_alarm_rule` ist seit 168 Admin-only.

## 2. Soll

1. **Verwalten** einer Regel (anlegen, ändern, pausieren, fortsetzen) setzt Schreibrecht am Dashboard voraus: persönlich → eigener Besitz; Team → `dashboard_team_can_write`. Zusätzlich bleibt die Rolle Admin/Manager Pflicht.
2. **Löschen und Pausieren** darf zusätzlich der Admin der Organisation (Admin-Ansicht „Alarme“ zeigt alle Regeln der Organisation und muss verwaiste Regeln entfernen können).
3. **Anlegen auf belegter Kachel** ändert die bestehende Regel nur für Schreibberechtigte und übernimmt dabei **nicht** die Verantwortung; Verantwortungswechsel nur über `takeover_dashboard_alarm_rule` (Admin).
4. **Lesen** (`list_dashboard_alarm_rules`, `list_dashboard_alarm_events`) setzt Leserecht am Dashboard voraus (persönlich: Besitz; Team: `dashboard_team_can_read`). Sonst `LP_DASHBOARD_NOT_FOUND` wie beim Laden des Dashboards.
5. Alle Prüfungen in der **aktuellen Organisation** der Sitzung (`current_organization_id()`).
6. `alarm_worker_status().aktiveRegeln` zählt nur Regeln der aktuellen Organisation (B-4).
7. Aufräumen in `team-dashboards.spec.ts` mit den richtigen Tabellen (`dashboards`, `dashboard_teams`) und sichtbarem Fehler statt Verschlucken (B-5).

## 3. Verbindliche Grenzen

Schutzbereiche unverändert; eine neue Migration (`20261129_dashboard_alarm_rule_rights.sql`), die nur die genannten Funktionen neu definiert; keine Tabellen-/Datenänderung; keine neuen Abhängigkeiten; Tests zuerst (die 5 TODO-Tests aus 173 werden reguläre Tests und sind vorher rot).

## 4. Ziel-Dateien

| Pfad | Änderung |
| --- | --- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_173A_ALARM_RECHTE.md` | Dieser Auftrag |
| neu `supabase/migrations/20261129_dashboard_alarm_rule_rights.sql` | Server |
| `supabase/tests/dashboard_rights_matrix_p16.sql` | TODO → regulär, Admin-Fälle |
| `e2e/team-dashboards.spec.ts` | Aufräumen (B-5) |
| `docs/dashboard/GESAMTABNAHME_P16.md`, `ARCHITECTURE_DECISIONS.md`, `BUILD_PLAN.md`, `docs/BUILD_LOG.md` | Doku |

## 5. Tasks

- [x] **T1** Rot-Nachweis: TODO-Block aus `dashboard_rights_matrix_p16.sql` als reguläre Tests, Admin-Fälle ergänzt, vor der Migration rot.
- [x] **T2** Migration, pgTAP grün, gesamte Suite grün.
- [x] **T3** B-5 und Abgleich mit Oberfläche/E2E (Admin-Ansicht „Alarme“, Alarm-E2E).
- [x] **T4** Doku, Pflicht-Verifikation, BUILD_LOG, PR.

## 6. Abnahme

- Kein Manager verwaltet oder sieht Regeln eines Dashboards, das er nicht schreiben bzw. lesen darf; der Admin kann verwaiste Regeln weiterhin übernehmen, pausieren und löschen.
- Matrixzeile 6 in `GESAMTABNAHME_P16.md` ohne Einschränkung.
