# ANTIGRAVITY_AUFTRAG_087 — Paket D: Designmuster zur Sichtabnahme

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan `docs/superpowers/plans/2026-10-06-frontend-qualitaet-plan.md`, Abschnitt 9 (Arbeitspaket D).
> Gestartet von Marc Poenisch im Chat am 09.10.2026 nach Merge von PR #72 (Auftrag 086).

## Entscheidungen Marc (09.10.2026, im Chat)

1. **Richtung:** ruhige Weiterentwicklung der LeadPilot-Marke (Option 1 von 3).
2. **3D-Tiefe bleibt:** Im direkten Vergleich zweier Beispielkacheln (A flach, B mit 3D-Tiefe) wählte
   Marc B: „mit 3D-Tiefe ist doch klar“. Die Planformulierung „Verlauf/Verteilung ohne dekorative
   3D-Tiefe“ ist damit revidiert; Befund F11 wird über Lesbarkeit gelöst, nicht über flache Diagramme.
3. **Vorlage:** keine Bildvorlage; Claude Code entwirft, Marc gibt per Sichtabnahme frei.
4. **Freigabe:** alle fünf Muster freigegeben („ja freigabe erteilt“).

## Baseline

- Branch `claude/auftrag-087-designmuster` von `main` `e007ff0` (Merge PR #72).
- Schutzbereichs-Baseline: `e007ff0`.

## Ziel-Dateien

| Datei                                                                                    | Änderung                             |
| ---------------------------------------------------------------------------------------- | ------------------------------------ |
| `src/features/dashboard/preview/DesignPatternPreview.tsx` (neu)                          | Musterseite, Farbmodus-Umschalter    |
| `src/features/dashboard/preview/designPatternTiles.tsx` (neu)                            | Kachelrahmen, Zustände, Muster 1 + 2 |
| `src/features/dashboard/preview/designPatternScreens.tsx` (neu)                          | Muster 3 – 5                         |
| `src/features/dashboard/preview/DashboardPreviewPage.tsx`                                | `?bereich=muster`                    |
| `docs/screenshots/auftrag-087/README.md` (neu), Plan Abschnitt 9, BUILD_LOG, diese Datei | Dokumentation                        |

Kein Produkt-Schalter, keine Änderung an Produktkomponenten.

## Freigegebene Muster

1. Kompakte Zahlkachel – Kennzahl groß vorn (32 px Mono), Einordnung daneben.
2. Verlauf/Verteilung – Summe vorn (24 px), darunter `Depth3dBarChart` mit 3D-Tiefe.
3. Mobile Dashboard-Startseite – Filter-Knopf, vier Schlüsselzahlen im 2er-Raster, dann Kacheln.
4. Funnel-Fachseite als HTML – 3D-Balken je Stufe plus Conversion-Tabelle aus derselben Quelle.
5. Vereinfachter Editor – eine Aktionsleiste je Kachel („Ziehen“ + „Kachel-Aktionen“ mit vier
   Einträgen), Einstellungen in „Kennzahl / Darstellung / Vorschau / Erweitert“, Hinweis
   Arbeitskopie vs. „Speichern“, Speichern/Verwerfen am Ende des Fensters.

## Gestaltungsregeln (verbindlich für Pakete E–G)

- Farben, Schriften, Tokens und Depth3d-Diagramme bestehen weiter; keine flachen Diagrammvarianten.
- Kachelkopf: Bereich (11 px, Großbuchstaben, `text-primary`), Titel 15 px semibold (bricht um, nie
  abgeschnitten), Quellenzeile 12 px gedämpft (Quelle · Stand · Zeitbezug).
- Kennzahl vor dem Diagramm; Kachelinnenabstand 16 px, Abstand zwischen Blöcken 12 px.
- Touchflächen ≥ 44 px (alle Knöpfe und Menüeinträge).
- Zustände: Fehler = „Nicht verfügbar“ + Erklärung + „Erneut versuchen“, nie 0; keine Daten = eigener Satz.
- Werte über Säulen/Balken folgen dem Textton (`--color-text-primary`), damit sie im hellen Modus lesbar sind.
- Fehlerrot im dunklen Modus aufgehellt (`#ff7a7e`), da `#ff5a5f` auf der Kachelfläche nur 4,46:1 erreicht.
- Menüs im Fluss statt schwebend, wenn sie sonst Inhalte überdecken oder auf 320 px aus dem Bild ragen.
- Kein seitlicher Überlauf auf 1440/768/375/320 px und bei 150 % Schrift; axe serious/critical 0.

## Tasks

- [x] Drei Richtungen gegenübergestellt; Marc wählt ruhige Weiterentwicklung.
- [x] Beispielkacheln A/B (ohne/mit 3D-Tiefe); Marc wählt B.
- [x] Fünf Muster mit belegten Faktenblatt-Werten, langem Titel, Fehler, keine Daten; reduzierte Bewegung über `useReducedMotion`.
- [x] 1440/768/375/320 px und 250 px (150 % Schrift), dunkel/hell: Überlauf 0, axe 0.
- [x] Sichtabnahme durch Marc: freigegeben.

## Übergabe

Die Übernahme ins Produkt (Wertfarbe, Fehlerrot, Kachelkopf, mobile Hülle, Funnel-HTML, Editor)
erfolgt in den Paketen E, F und G gegen diese Regeln.
