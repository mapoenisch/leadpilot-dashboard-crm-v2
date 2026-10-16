# ANTIGRAVITY_AUFTRAG_094 — Paket G2, Welle 1: Unternehmensseiten als echte Seiten

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan Abschnitt 12 (Arbeitspaket G), Teil G2, erste Welle. Vorgehen wie G1 (Auftrag 093, Revision 13.10.2026):
> Das Original-WebP ist die Vorlage, kein Inhalt geht verloren, 3D bleibt, „ruhig“ dämpft nur.

## Baseline

- Branch `claude/auftrag-094-g2-welle-1` von `main` `06f90bf` (nach Merge PR #80).
- Schutzbereichs-Baseline: `06f90bf`.

## Welle

Drei einfache Seiten der Gruppe Unternehmen (Plan: „3–5 einfache Seiten aus Unternehmensübersicht/Produkt“):

| Schlüssel                   | Route                        | Original-WebP                                              |
| --------------------------- | ---------------------------- | ---------------------------------------------------------- |
| `company-idea`              | `/company/idea`              | `public/assets/auftrag-037g/04-geschaeftsidee.webp`        |
| `company-value-proposition` | `/company/value-proposition` | `public/assets/auftrag-037g/05-value-proposition.webp`     |
| `company-history`           | `/company/history`           | `public/assets/auftrag-037g/06-gruendung-entwicklung.webp` |

## Ziel-Dateien

| Datei                                                                                                 | Änderung                                                                                  |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/config/pagePresentation.ts`                                                                      | `HTML_PAGES` um die drei Schlüssel ergänzt                                                |
| `src/features/unternehmen/pages/IdeaPage.tsx`, `ValuePropositionPage.tsx`, `HistoryPage.tsx`          | Gestaltung nach Original-WebP                                                             |
| `src/features/unternehmen/unternehmenSeiten.css` (neu)                                                | Seitenstile inkl. Ruhig-Fassung und schmale Breiten                                       |
| `src/domain/unternehmenData.ts`                                                                       | `IDEE.uspKacheln` (Kacheltexte der Illustration), `hervorgehoben` bei Gründung und Launch |
| Tests `g54SemanticPages.ui`, `g66DesignRestore.ui`, `g93FunnelPage.ui`, neu `g94UnternehmenSeiten.ui` | angepasst bzw. ergänzt                                                                    |
| `scripts/captureAuftrag094Unternehmen.mjs`, `docs/screenshots/auftrag-094/README.md`                  | Nachweis                                                                                  |
| Doku: `docs/BUILD_LOG.md`, Plan Abschnitt 12, dieser Auftrag                                          | Nachweis                                                                                  |

Nachtrag CI (16.10.2026): `e2e/semantic-routes.spec.ts` – Zuordnung `HTML_PAGE_ROUTES` um die drei
Seiten ergänzt (die Suite bricht bewusst ab, wenn eine freigegebene Seite keine Route hat).

## Globale Grenzen

- Schutzbereiche (`src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources`) unverändert.
- Werte und Texte unverändert aus `unternehmenData.ts`; gegen Faktenblatt v1.2 geprüft (Gründung 21.07.2022, 25.000 € → 31.250 €, Wandeldarlehen 250.000 €, Seed 950.000 €, Starter 49 €/Growth 89 €, ARR 411.840 €, MRR 34.320 €, 66 Kunden, Umsatz 336.000 €).
- Gemeinsames Page-Kit (`src/components/pageKit/**`) unverändert, damit die übrigen Bildseiten nicht driften. Keine neuen Abhängigkeiten.
- Bilddateien bleiben erhalten; nur die drei Routen zeigen kein Bild mehr.

## Inhaltsinventar und Abweichungen zum Original

- **Geschäftsidee:** Icon-Kachel links neben den zwei Absätzen (kein Titel „Problem & Lösung“ wie im Original), 3D-Illustration „B2B Leads ↗“ rechts; USP-Karte mit Zielscheiben-Icon in Orange, Überschrift „Alleinstellungsmerkmale (USPs)“, gefüllte orange Häkchen, 3D-Kachelstapel „DSGVO Konform · KI-Scoring · Schnell einsatzbereit · Serverstandort Deutschland“. Illustrationen sind dekorativ (`aria-hidden`).
- **Value Proposition:** Untertitel wie Original („Kernvorteile und Markenversprechen.“), Leucht-Zitat mit Anführungszeichen-Icon, drei Karten mit Icon links neben Titel und Text.
- **Historie:** Untertitel wie Original, Zeitleiste mit Punkt, Datums-Chip, Karte mit Icon, Titel, Text und Pfeil-Kreis; Gründung und Produkt-Launch orange wie im Original. Pfeil-Kreise sind Zierde ohne Ziel (nicht fokussierbar, `aria-hidden`).
- **Bewusste Abweichung:** Das Original schreibt „Wandelarlehen“ (Tippfehler im Bild); die Seite behält das korrekte „Wandeldarlehen“ aus Domäne und Faktenblatt.

## Tasks

- [x] Inhaltsinventar je WebP und Abgleich mit Faktenblatt v1.2.
- [x] Seitenfreigabe um die drei Seiten erweitert; Rückschaltung = Einträge entfernen.
- [x] Drei Seiten nach Original-WebP gebaut, „ruhig“ (`data-ruhig`), hell und dunkel.
- [x] Tests: Freigabe genau Funnel + Welle 1, andere Seiten bleiben Bild, voller Inhalt, Reihenfolge und Töne der Zeitleiste, dekorative Teile ausgeblendet.
- [x] Nachweis 3 Seiten × 1440/768/375/320/250 px × dunkel/hell: 30/30, Überlauf 0, axe 0, Hash verschieden.
- [x] Sichtabnahme der drei Seiten durch Marc (15.10.2026).
