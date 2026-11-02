# Auftrag 120 – Überlauf auf „Entwicklung der Teamgröße“ bei 375 px

**Plan:** Abschnitt 15 (Paket I), Befund aus Auftrag 119 (Befundregister, „Vorher/Nachher“). Baseline `719af0d` (Branch von PR #111).

## Ziel-Dateien
| Datei | Änderung |
|---|---|
| `src/features/organisation/organisationSeiten.css` | Nur für die Teamgröße-Seite bei ≤ 480 px: `max-width: 100%` für den Diagramm-Container (Regel setzte `max-width: 760px` und `margin-inline: auto`, dadurch Breite = Mindestbreite 420 px); breitere Ansichten unverändert |
| `scripts/captureAuftrag120Gate.mjs` (neu), `docs/screenshots/auftrag-120/README.md` | Vorher/Nachher-Nachweis für alle drei `DepthFlaechen`-Seiten (Teamgröße, Unit Economics, Produkt-Performance) bei 1440/768/375 px, beide Themes, Überlauf und Hash |
| `docs/reviews/2026-10-06-frontend-befundregister.md`, `docs/BUILD_LOG.md` | Befund geschlossen, Protokoll |

## Globale Grenzen
Schutzbereiche unverändert. Keine neue Abhängigkeit.

## Tasks
- [x] Ursache messen (Container 420 px in 293-px-Spalte, `<main>` scrollWidth 461)
- [x] Korrektur nur im Seiten-CSS (Codex P1: eine Änderung an `DepthFlaechen` selbst hätte `unit-economics` und `performance` mitverändert; erster Versuch änderte außerdem die Breite bei 1440/768, verworfen)
- [x] Vorher/Nachher-Matrix: nur 375 px auf der Teamgröße-Seite verändert, 0 px Überlauf überall
- [x] Tests, BUILD_LOG
