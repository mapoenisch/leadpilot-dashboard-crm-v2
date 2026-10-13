# ANTIGRAVITY_AUFTRAG_093 — Paket G1: Sales Funnel als erste echte Seite

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan Abschnitt 12 (Arbeitspaket G), Teil G1. Grundlage: freigegebenes Muster 4 aus Auftrag 087.

## Baseline

- Branch `claude/auftrag-093-funnel-seite` von `main` `ce506b5` (nach Merge PR #78).
- Schutzbereichs-Baseline: `ce506b5`.

## Ziel-Dateien

| Datei                                                                                                                                               | Änderung                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/config/pagePresentation.ts`                                                                                                                    | Seitenfreigabe `HTML_PAGES` (Welle G1: `sales-funnel`), globaler Schalter bleibt Bild |
| `src/components/imagePage/ImagePage.tsx`                                                                                                            | freigegebene Seiten zeigen den Inhalt sichtbar statt Bild + Textschicht               |
| `src/features/vertrieb/pages/FunnelPage.tsx`                                                                                                        | Gestaltung nach Muster 4: Kopf, 3D-Balken, Conversion-Tabelle, Quartale, Hinweis      |
| Tests `g67ImagePages.ui`, `g53SemanticPages.ui`, `g66DesignRestore.ui`, `FunnelPage.branch3.ui`, `VertriebPages.branch2.ui`, neu `g93FunnelPage.ui` | angepasst bzw. ergänzt                                                                |
| `scripts/captureAuftrag093Funnel.mjs`, `docs/screenshots/auftrag-093/README.md`                                                                     | Nachweis                                                                              |
| Doku: `docs/BUILD_LOG.md`, Plan Abschnitt 12, dieser Auftrag                                                                                        | Nachweis                                                                              |

## Globale Grenzen

- Schutzbereiche (`src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources`) unverändert.
- Werte ausschließlich aus `FUNNEL`/`FUNNEL_QUARTALE` (Faktenblatt, in Auftrag 085 geklärt); keine neuen Zahlen.
- Bilddateien, Logo und Referenzbilder bleiben erhalten; nur die Funnel-Route zeigt kein Bild mehr.
- Gemeinsame Diagrammkomponenten (`Depth3dBarChart`, `ColumnChart`) unverändert. Keine neuen Abhängigkeiten.

## Tasks

- [x] Seitenfreigabe `HTML_PAGES` neben dem globalen Schalter; Rückschaltung = Eintrag entfernen.
- [x] Funnel nach Muster 4: Eyebrow „Vertrieb · Funnel“, h1, Quellenzeile; Karte „Stufen im Geschäftsjahr“ (3D-Balken, waagerecht) und „Conversion je Stufe“ (Tabelle mit Zeilenköpfen), beide aus `FUNNEL.rows`; Testversionen nur als Nebenpfad in der Tabelle.
- [x] Quartalsverlauf (Säulen + vollständige Trichtertabelle) und Hinweis „Trial-to-Paid“ erhalten.
- [x] Ganzseitenbild, Zoom-Hinweis und abgebildete Simulationsleiste auf der Funnel-Seite entfernt.
- [x] Tests: Freigabe nur Funnel, andere Seiten bleiben Bild, gleiche Quelle für Diagramm und Tabelle, Aufbau nach Muster.
- [x] Nachweis 1440/768/375/320/250 px × dunkel/hell: Überlauf 0, axe 0, Hash verschieden.
- [ ] Sichtabnahme der Funnel-Seite durch Marc.
