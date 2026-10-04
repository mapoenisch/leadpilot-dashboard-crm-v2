# Screenshot-Matrix Auftrag 073 (Dashboard Teilauftrag 4, Kachelrahmen und Diagramme)

Erzeugt mit `scripts/captureAuftrag073Screenshots.mjs` gegen zwei Vorschau-Builds (`VITE_DASHBOARD_PREVIEW=true`, `vite preview`): Vorher = Basis `92180d3` (nur Testkachel), Nachher = dieser Stand (Testkachel und Kachelgalerie). Feste Testdaten, `prefers-reduced-motion: reduce`. Bilder bleiben lokal (`.gitignore`, `CLAUDE.md` §7).

- Aufnahme: 2026-10-04T15:41:20.173Z
- Vorher/Nachher-Paare verschieden: ja
- Größter horizontaler Seitenüberlauf: 0 px (auf 375 px scrollt nur das Diagramm innerhalb der Kachel, Designfreigabe)
- axe-Verstöße serious/critical in der Galerie: 0
- Fokus je Diagrammart füllt die Ablesezeile (Wert, Einheit, Kategorie, Zeitraum): ja
- Netzwerk `?ansicht=zahl`: Testkachel ausgeblendet, geladene Diagrammmodule: keine
- Netzwerk `?ansicht=ring`: Testkachel ausgeblendet, geladene Diagrammmodule: Depth3dDonutChart

## Vorher/Nachher (ganze Seite)

| Breite | Vorher | Nachher | Überlauf nachher |
|---:|---|---|---:|
| 1440 | `3df09d8680ac4ee5` | `8ea05a24b9dbfcb2` | 0 px |
| 768 | `dc7ff51cb7b59fe2` | `a360b12afbddc34c` | 0 px |
| 375 | `c7d7daa76780cbe9` | `96dc0695c99e138e` | 0 px |

## Fokus je Diagrammart (Galerie)

| Breite | Diagramm | Ablesezeile | SHA-256 (gekürzt) |
|---:|---|---|---|
| 1440 | depth-bar-chart | Q1 · 42.000 EUR · Testzeitraum | `efeac76e69a4fda3` |
| 1440 | depth-hbar-chart | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `d8e7b9b8123d7d9b` |
| 1440 | depth-donut-chart | Starter · 18.400 EUR · Stand 31.12.2025 | `5697fcffb795beed` |
| 1440 | depth-line-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `90b6b5e0434069fe` |
| 1440 | depth-area-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `bf14ac82a1dcc6e9` |
| 768 | depth-bar-chart | Q1 · 42.000 EUR · Testzeitraum | `d01db865b1399c67` |
| 768 | depth-hbar-chart | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `56fc11a7dbeda742` |
| 768 | depth-donut-chart | Starter · 18.400 EUR · Stand 31.12.2025 | `bb97f6ecafedd1f7` |
| 768 | depth-line-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `bedf316660e6f3d5` |
| 768 | depth-area-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `d6e4a44f89046c0b` |
| 375 | depth-bar-chart | Q1 · 42.000 EUR · Testzeitraum | `cb1d382843cb1993` |
| 375 | depth-hbar-chart | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `86482dfb0e7758a4` |
| 375 | depth-donut-chart | Starter · 18.400 EUR · Stand 31.12.2025 | `2b1e05f020095a43` |
| 375 | depth-line-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `4ec5d1e7ea8992a0` |
| 375 | depth-area-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `d6ab2ac7578746a5` |

## Kacheln

Die Ring-Kacheln Nr. 7 und 8 sind absichtlich identisch (getrennte SVG-IDs); gleiche Hashes sind dort erwartet.

| Breite | Nr. | Darstellung | Größe | Zustand | SHA-256 (gekürzt) |
|---:|---:|---|---|---|---|
| 1440 | 1 | zahl | klein | bereit | `f068b39e457baa41` |
| 1440 | 2 | zahl | klein | veraltet | `250a5d7c1b46a336` |
| 1440 | 3 | zahl | klein | offline | `f472d904d087e0dd` |
| 1440 | 4 | zahl | klein | bereit | `56e858c811c4f2b5` |
| 1440 | 5 | linie | mittel | bereit | `451f06cec03a5540` |
| 1440 | 6 | flaeche | mittel | bereit | `6bf7f46f5d22bfc4` |
| 1440 | 7 | ring | mittel | bereit | `3c76583894c122c9` |
| 1440 | 8 | ring | mittel | bereit | `d8fa5631f34e760b` |
| 1440 | 9 | kreis | gross | bereit | `35bb040753271172` |
| 1440 | 10 | tabelle | mittel | bereit | `1694f169c65b7894` |
| 1440 | 11 | balken | mittel | bereit | `2c953c7027f6573d` |
| 1440 | 12 | zahl | mittel | bereit | `fd1dbd97b450b173` |
| 1440 | 13 | saeulen | mittel | bereit | `abe931ab22205f82` |
| 1440 | 14 | balken | mittel | bereit | `e50ba0e10ee0ff93` |
| 1440 | 15 | saeulen | mittel | bereit | `70923409231ed858` |
| 1440 | 16 | ring | mittel | bereit | `898a21d3d06a8160` |
| 1440 | 17 | linie | mittel | bereit | `a460e07c3689bcc6` |
| 1440 | 18 | saeulen | mittel | laden | `388bc3bd84cc1d72` |
| 1440 | 19 | zahl | klein | keine_daten | `bbca2f6da215f505` |
| 1440 | 20 | zahl | klein | fehler | `d5292082cf6fa96e` |
| 1440 | 21 | zahl | klein | nicht_konfiguriert | `d40c8fed08f76a2c` |
| 1440 | 22 | zahl | klein | nicht_verfuegbar | `bac4f2755e5df847` |
| 1440 | 23 | uebersicht | mittel | bereit | `b63bce82704a1d1e` |
| 1440 | 24 | uebersicht | mittel | bereit | `0c63cf4cb891a360` |
| 1440 | 25 | saeulen | voll | bereit | `47930a88a5c57264` |
| 768 | 1 | zahl | klein | bereit | `9acc458f1d95c561` |
| 768 | 2 | zahl | klein | veraltet | `599147d4043e7512` |
| 768 | 3 | zahl | klein | offline | `dc02db22048b2470` |
| 768 | 4 | zahl | klein | bereit | `7464a7910f7f9cce` |
| 768 | 5 | linie | mittel | bereit | `4c48be01e29651d2` |
| 768 | 6 | flaeche | mittel | bereit | `7b4fd573731f2847` |
| 768 | 7 | ring | mittel | bereit | `fe6db09549b1cd26` |
| 768 | 8 | ring | mittel | bereit | `fe6db09549b1cd26` |
| 768 | 9 | kreis | gross | bereit | `99a937c205a82193` |
| 768 | 10 | tabelle | mittel | bereit | `5f402bdec3c81dcf` |
| 768 | 11 | balken | mittel | bereit | `21602f16515c9640` |
| 768 | 12 | zahl | mittel | bereit | `5051db15eca8c644` |
| 768 | 13 | saeulen | mittel | bereit | `ed103f5fd28aca7c` |
| 768 | 14 | balken | mittel | bereit | `967cae113dc59a43` |
| 768 | 15 | saeulen | mittel | bereit | `378fcd560311218c` |
| 768 | 16 | ring | mittel | bereit | `3564f64fdb9f56d7` |
| 768 | 17 | linie | mittel | bereit | `6add4f8034b245e1` |
| 768 | 18 | saeulen | mittel | laden | `44db020daf6a8678` |
| 768 | 19 | zahl | klein | keine_daten | `b418ed0a946760d3` |
| 768 | 20 | zahl | klein | fehler | `12b9a35e42502cba` |
| 768 | 21 | zahl | klein | nicht_konfiguriert | `6eff8090dc3f1002` |
| 768 | 22 | zahl | klein | nicht_verfuegbar | `a9dbad0a7c17c2ed` |
| 768 | 23 | uebersicht | mittel | bereit | `90d174e0b74bf344` |
| 768 | 24 | uebersicht | mittel | bereit | `1cd0575f1f7ea34b` |
| 768 | 25 | saeulen | voll | bereit | `7d4cbf0e11bbd2f1` |
| 375 | 1 | zahl | klein | bereit | `09f2a207151cef13` |
| 375 | 2 | zahl | klein | veraltet | `f376322f29c07f7d` |
| 375 | 3 | zahl | klein | offline | `9bcd147390a6ba7b` |
| 375 | 4 | zahl | klein | bereit | `00f2b08360053b9c` |
| 375 | 5 | linie | mittel | bereit | `a7c6ded7248d2279` |
| 375 | 6 | flaeche | mittel | bereit | `e11b09ee6b537db4` |
| 375 | 7 | ring | mittel | bereit | `2c441f1b1d72d112` |
| 375 | 8 | ring | mittel | bereit | `2c441f1b1d72d112` |
| 375 | 9 | kreis | gross | bereit | `517e4e5904b567e2` |
| 375 | 10 | tabelle | mittel | bereit | `ca4eeaa6a776ce85` |
| 375 | 11 | balken | mittel | bereit | `f50b0a1a8cc51dad` |
| 375 | 12 | zahl | mittel | bereit | `b22c07397a9bbe07` |
| 375 | 13 | saeulen | mittel | bereit | `7133439d7a5973f0` |
| 375 | 14 | balken | mittel | bereit | `f87cfb7a592dd7c7` |
| 375 | 15 | saeulen | mittel | bereit | `2bc78fe8eea69d70` |
| 375 | 16 | ring | mittel | bereit | `0282ac12054b199a` |
| 375 | 17 | linie | mittel | bereit | `4f07b035bbd6c800` |
| 375 | 18 | saeulen | mittel | laden | `64c9325ea1351b71` |
| 375 | 19 | zahl | klein | keine_daten | `01290ed380f86b0c` |
| 375 | 20 | zahl | klein | fehler | `9f3d94ac117c0c14` |
| 375 | 21 | zahl | klein | nicht_konfiguriert | `232de4d5677c6ea2` |
| 375 | 22 | zahl | klein | nicht_verfuegbar | `f963c13d6701d0b4` |
| 375 | 23 | uebersicht | mittel | bereit | `b8060c9e5e7a00a0` |
| 375 | 24 | uebersicht | mittel | bereit | `3f33b67ceb5ae1cd` |
| 375 | 25 | saeulen | voll | bereit | `ec26eed3ec153cae` |

| Breite | Seitenüberlauf | axe serious/critical |
|---:|---:|---|
| 1440 | 0 px | keine |
| 768 | 0 px | keine |
| 375 | 0 px | keine |
