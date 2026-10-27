# Auftrag 121 – Paket I Teil 2: gespeicherte Dashboard-Zustände und langsame CRM-Antwort

**Plan:** Abschnitt 15 (Paket I), Punkte 1 („leere Ansicht, ungültige/neuere Konfiguration“) und 2 („langsame Antwort“); Abnahmematrix `docs/reviews/2026-10-27-paket-i-abnahmematrix.md`, Zeilen 1f und 2d. Baseline `639ebb9` (main nach PR #112).

## Ziel-Dateien

| Datei                                       | Änderung                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `e2e/dashboard-config-states.spec.ts` (neu) | Drei E2E-Tests: leere Ansicht, ungültige Konfiguration, Konfiguration aus neuerer Version               |
| `e2e/helpers/dashboardPreferences.ts`       | `forceStoredRow`: schreibt eine vom Server über die RPC abgelehnte Zeile lokal mit dem Aufräumschlüssel |
| `e2e/crm-query-export.spec.ts`              | Test „Langsame Antwort“; `controlCrm` bekommt optional ein Tor (`gate`), das die Antwort zurückhält     |
| `.github/workflows/ci.yml`                  | Neue Spec im seriellen Dashboard-Lauf                                                                   |
| Abnahmematrix, `docs/BUILD_LOG.md`          | Zeilen 1f und 2d, Protokoll                                                                             |

## Globale Grenzen

Kein Produktcode geändert. Schutzbereiche unverändert. Keine neue Abhängigkeit.

## Tasks

- [x] 1f: leere Ansicht zeigt den Hinweis, keine Kacheln, Bearbeiten bleibt möglich
- [x] 1f: ungültige Konfiguration zeigt Hinweis und Standardansicht, die fehlerhafte Kachel erscheint nicht
- [x] 1f: neuere Schemaversion sperrt Bearbeiten, Zeile (Revision, Konfiguration) bleibt unverändert
- [x] 2d: langsame CRM-Antwort zeigt Ladezustand (nicht „0“, kein Fehler), Export gesperrt, Navigation möglich, Daten erscheinen nach Freigabe
- [x] Lauf auf 1440/768/375 px, tsc, ESLint, Prettier
