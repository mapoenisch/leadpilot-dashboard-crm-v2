# Auftrag 120 – Überlauf auf „Entwicklung der Teamgröße“ bei 375 px

**Plan:** Abschnitt 15 (Paket I), Befund aus Auftrag 119 (Befundregister, „Vorher/Nachher“). Baseline `719af0d` (Branch von PR #111).

## Ziel-Dateien
| Datei | Änderung |
|---|---|
| `src/features/finanzen/components/DepthFlaechen.tsx` | Container `w-full min-w-0 max-w-full`, damit er nicht auf die Mindestbreite des Diagramms (420 px) wächst; das Diagramm scrollt lokal |
| `docs/reviews/2026-10-06-frontend-befundregister.md`, `docs/BUILD_LOG.md` | Befund geschlossen, Protokoll |

## Globale Grenzen
Schutzbereiche unverändert. Keine neue Abhängigkeit.

## Tasks
- [x] Ursache messen (Container 420 px in 293-px-Spalte, `<main>` scrollWidth 461)
- [x] Korrektur, Nachmessung bei 375 px: `<main>` 375/375, Container 293 px
- [x] Tests, BUILD_LOG
