# Auftrag 125 – Lighthouse-Prüfung stabilisieren und nachvollziehbar machen

**Builder:** Claude Code · **Prüfer:** Codex (GitHub) · **Merge:** Marc

## Anlass
Seit 02.11.2026 scheitert der Check `e2e` an `categories:performance` (gemessen 0,85, gefordert ≥ 0,9) – auf `main` (Lauf nach Merge PR #122, reine Doku) und in allen PRs. Am 30.10.2026 war derselbe Code grün. Die Ursache ist nicht sichtbar: Der Lighthouse-Bericht wird nie hochgeladen, weil `.lighthouseci/` ein Punkt-Ordner ist und `actions/upload-artifact` v4 versteckte Dateien standardmäßig auslässt (Warnung „No files were found").

## Globale Grenzen
Nur CI-Konfiguration. Keine Änderung an `src/`, Schutzbereichen oder Schwellenwerten (0,9 / 0,95 bleiben). Keine neuen Abhängigkeiten.

## Ziel-Dateien
| Datei | Änderung |
| --- | --- |
| `.github/workflows/ci.yml` | `include-hidden-files: true` beim Lighthouse-Artefakt |
| `.lighthouserc.json` | `numberOfRuns` 1 → 3; `aggregationMethod: "median"` für beide Assertions (Standard wäre `optimistic`) |
| `scripts/verifyV23ReleaseReadiness.ts` | `checkLighthouse` wertet den Median der neuesten 3 frischen Berichte statt nur den letzten |
| `scripts/__tests__/verifyV23ReleaseReadiness.vitest.ts` | Test für die Median-Auswertung |
| `index.html` | Preload der drei lokalen Webfonts (Ursache siehe unten) |
| `docs/BUILD_LOG.md` | Builder-Eintrag |

## Tasks
- [x] Artefakt-Upload repariert, damit der Bericht (Metriken, Ursache) einsehbar wird.
- [x] Drei Läufe statt einem, damit ein einzelner Ausreißer keinen PR blockiert.
- [x] Bericht des CI-Laufs gesichtet: alle 3 Läufe identisch (Performance 0,85, CLS 0,266, übrige Werte gut). Ursache: Webfonts Inter/Space Grotesk werden spät geladen (`font-display: swap`) und verschieben `main#main-content` (Layout-Shift 0,257). Kein Rauschen, daher hilft der Median allein nicht.
- [x] Fonts per `<link rel="preload">` in `index.html` vorab laden.

## Abnahme
CI-Lauf dieses PR: Artefakt `lighthouse-report` enthält Berichte; `e2e` zeigt Median aus 3 Läufen.
