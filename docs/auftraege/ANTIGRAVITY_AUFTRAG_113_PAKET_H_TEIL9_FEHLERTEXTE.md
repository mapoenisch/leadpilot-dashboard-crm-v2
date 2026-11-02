# ANTIGRAVITY_AUFTRAG_113 — Paket H Teil 9: Fehler- und Ladetexte mit nächstem Schritt

> **Builder:** Claude Code · **Prüfer:** unabhängig (`/<agent> review`)
> Plan Abschnitt 13, Punkt „Leer-/Fehlertexte sagen, was fehlt und welchen nächsten Schritt es gibt“. Baseline `22f4f1d` (main nach PR #104).

## Änderungen

| Stelle                          | Bisher                                     | Neu                                                    |
| ------------------------------- | ------------------------------------------ | ------------------------------------------------------ |
| `DataState` Standard-Fehlertext | „Daten konnten nicht geladen werden.“      | + „Versuche es erneut oder lade die Seite neu.“        |
| `ActivitiesView` Fehler         | „… Es werden keine Ersatzdaten angezeigt.“ | + „Lade die Seite neu oder versuche es später erneut.“ |
| `DataBasisPage` Fehler          | dito                                       | + „Lade die Seite neu oder prüfe die Verbindung.“      |
| Ladetexte / Quellenzeilen       | „CRM-Envelope“                             | „CRM-Daten“                                            |

## Tasks

- [x] Fehlertexte um nächsten Schritt ergänzen; Entwicklerbegriff „Envelope“ aus Nutzertexten entfernen.
- [x] Test-Erwartungen anpassen.
- [ ] Offen, eigene Aufträge: Ebenen-Unterscheidung (Historie/CRM/Simulation), Fokusprüfung Menü, Leertexte mit Berechtigungsbezug (Importieren-Vorschlag), `sourceFreshness.ts` (Schutzbereich), `systemHealthService.ts`, Auth-Fehlermeldung.

## Grenzen

Nur Beschriftungen. Schutzbereiche unverändert. Keine neue Abhängigkeit.

## Rückweg

`git revert`.
