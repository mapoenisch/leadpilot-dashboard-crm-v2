# ANTIGRAVITY_AUFTRAG_105 — Paket H Teil 1: Abmelden sichtbar, aktive Seite markiert, echtes Profil

> **Builder:** Claude Code · **Prüfer:** unabhängig (Codex oder anderer Agent über `/<agent> review`)
> Plan Abschnitt 13 (Arbeitspaket H). Paket H ist geteilt: Teil 1 (dieser Auftrag) und Teil 2 (Sprachliste, Leer-/Fehlertexte, Gruppierung der Navigation).

## Baseline

- Branch `claude/auftrag-105-paket-h` von `main` `c895a80` (nach Merge PR #93). Schutzbereichs-Baseline: `c895a80`.

## Tasks

- [x] Abmelden als dauerhaft sichtbare Profilaktion in der Kopfzeile (Desktop und Handy; auf kleinen Breiten Symbol, Name im zugänglichen Namen). Der unsichtbare Hover-Button unten rechts entfällt. `data-testid="logout-button"` und `data-leave-guard` bleiben (Schutz ungespeicherter Änderungen).
- [x] Profil zeigt die angemeldete E-Mail und die Rolle aus der Organisation (Administrator, Manager, Nur Lesen) statt des fest eingetragenen Namens und Titels.
- [x] Aktive Seite in der Seitenleiste deutlich markiert (Akzentbalken links), unterscheidbar von Hover und aufgeklapptem Abschnitt.
- [ ] Teil 2: Sprachliste anwenden, Leer-/Fehlertexte, Gruppierung nach Aufgaben, Fokusprüfung Menü (Plan 13, übrige Punkte).

## Ziel-Dateien

| Datei                                                  | Änderung                                     |
| ------------------------------------------------------ | -------------------------------------------- |
| `src/components/layout/Header.tsx`                     | Profil aus Props, Abmelden-Button            |
| `src/components/layout/Layout.tsx`                     | Props übergeben, schwebenden Button entfernt |
| `src/components/ui/NavItem.tsx`                        | Akzentbalken für aktiven Zustand             |
| `Header.ui`, `LayoutSupplement.characterization.ui`    | Tests angepasst/ergänzt                      |
| `docs/BUILD_LOG.md`, Plan Abschnitt 13, dieser Auftrag | Nachweis                                     |

## Globale Grenzen

Schutzbereiche unverändert, keine neue Abhängigkeit, keine Routen entfernt.

## Rückweg

Commit zurücknehmen (`git revert`); keine Datenbankänderung.
