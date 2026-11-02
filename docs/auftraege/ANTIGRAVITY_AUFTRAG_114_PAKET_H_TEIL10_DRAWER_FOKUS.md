# ANTIGRAVITY_AUFTRAG_114 — Paket H Teil 10: Fokusführung des mobilen Menüs

> **Builder:** Claude Code · **Prüfer:** unabhängig (`/<agent> review`)
> Plan Abschnitt 13, Punkt „Fokus beim Menüöffnen/-schließen, Escape, Hintergrundsperre, Rückgabe zum Auslöser“. Baseline `e1e19f2` (main nach PR #105).

## Befund

- Escape gab den Fokus an den Auslöser zurück, Schließen per X, Hintergrund oder Link-Klick nicht (Fokus ging verloren).
- Beim Öffnen blieb der Fokus auf dem Auslöser hinter dem Drawer.
- Hintergrundsperre (`inert` in `Layout.tsx`) und Focus-Trap waren bereits vorhanden.

## Änderungen

| Stelle                 | Bisher                                | Neu                                                                                                             |
| ---------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `Sidebar.tsx`          | Fokus-Rückgabe nur im Escape-Handler  | Ein Effekt am Zustandswechsel: Öffnen → Fokus in den Drawer; jedes Schließen → Fokus auf `#mobile-menu-trigger` |
| `Sidebar.branch3` Test | Escape-Test mit festgehaltenem Drawer | Zustandsbehafteter Wrapper; Tests für Öffnen, Escape, X, Hintergrund                                            |

## Tasks

- [x] Fokuslogik zentralisieren.
- [x] Tests für alle Schließwege.
- [ ] Offen, eigene Aufträge: Benutzerwechsel-Test, Touch-Prüfung im Browser, Ebenen-Unterscheidung (Historie/CRM/Simulation), `sourceFreshness.ts` (Schutzbereich).

## Grenzen

Nur Verhalten der Fokusführung, keine sichtbare Änderung. Schutzbereiche unverändert. Keine neue Abhängigkeit.

## Rückweg

`git revert`.
