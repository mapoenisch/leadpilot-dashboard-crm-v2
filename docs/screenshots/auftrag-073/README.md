# Screenshot-Matrix Auftrag 073 (Dashboard Teilauftrag 4, Kachelrahmen und Diagramme)

Erzeugt mit `scripts/captureAuftrag073Screenshots.mjs` gegen zwei Vorschau-Builds (`VITE_DASHBOARD_PREVIEW=true`, `vite preview`): Vorher = Basis `92180d3` (nur Testkachel), Nachher = dieser Stand (Testkachel und Kachelgalerie). Feste Testdaten, `prefers-reduced-motion: reduce`. Bilder bleiben lokal (`.gitignore`, `CLAUDE.md` §7).

- Aufnahme: 2026-10-04T16:27:25.693Z
- Vorher/Nachher-Paare verschieden: ja
- Größter horizontaler Seitenüberlauf: 0 px (auf 375 px scrollt nur das Diagramm innerhalb der Kachel, Designfreigabe)
- axe-Verstöße serious/critical in der Galerie: 0
- Maus-Hover je Diagrammart hebt das Datum hervor und füllt die Ablesezeile: ja
- Inhaltshöhe gleich (Säulen „mittel“ Laden/fertig, Linie „mittel“ leer/mit Daten): ja (1440: 430/430 px, Linie leer/voll 385/385 px, 768: 461/461 px, Linie leer/voll 416/416 px, 375: 430/430 px, Linie leer/voll 385/385 px)
- Fokus je Diagrammart füllt die Ablesezeile (Wert, Einheit, Kategorie, Zeitraum): ja
- Netzwerk `?ansicht=zahl`: Testkachel ausgeblendet, geladene Diagrammmodule: keine
- Netzwerk `?ansicht=ring`: Testkachel ausgeblendet, geladene Diagrammmodule: Depth3dDonutChart

## Vorher/Nachher (ganze Seite)

| Breite | Vorher | Nachher | Überlauf nachher |
|---:|---|---|---:|
| 1440 | `3df09d8680ac4ee5` | `b4e21b94ac3d1d47` | 0 px |
| 768 | `dc7ff51cb7b59fe2` | `b81c863175e023c3` | 0 px |
| 375 | `c7d7daa76780cbe9` | `4cf9373256cbf777` | 0 px |

## Fokus je Diagrammart (Galerie)

| Breite | Diagramm | Ablesezeile | SHA-256 (gekürzt) |
|---:|---|---|---|
| 1440 | depth-bar-chart | Q1 · 42.000 EUR · Testzeitraum | `521550648e9f97d4` |
| 1440 | depth-hbar-chart | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `a5e16959bcef309a` |
| 1440 | depth-donut-chart | Starter · 18.400 EUR · Stand 31.12.2025 | `1d604fd993bad57c` |
| 1440 | depth-line-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `90b6b5e0434069fe` |
| 1440 | depth-area-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `bf14ac82a1dcc6e9` |
| 768 | depth-bar-chart | Q1 · 42.000 EUR · Testzeitraum | `063d68ed473040a1` |
| 768 | depth-hbar-chart | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `9ec7b2963227a842` |
| 768 | depth-donut-chart | Starter · 18.400 EUR · Stand 31.12.2025 | `ee9f322b70fe5290` |
| 768 | depth-line-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `bedf316660e6f3d5` |
| 768 | depth-area-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `d6e4a44f89046c0b` |
| 375 | depth-bar-chart | Q1 · 42.000 EUR · Testzeitraum | `ddabdaff1e341f62` |
| 375 | depth-hbar-chart | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `a2a6589e25d9fecb` |
| 375 | depth-donut-chart | Starter · 18.400 EUR · Stand 31.12.2025 | `256b283e2e108caa` |
| 375 | depth-line-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `4ec5d1e7ea8992a0` |
| 375 | depth-area-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `d6ab2ac7578746a5` |

## Maus-Hover je Diagrammart (Galerie)

| Breite | Diagramm | hervorgehoben | Ablesezeile | SHA-256 (gekürzt) |
|---:|---|---|---|---|
| 1440 | depth-bar-chart | ja | Q1 · 42.000 EUR · Testzeitraum | `28a11e984586da6e` |
| 1440 | depth-hbar-chart | ja | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `39c5cde7176ef8e8` |
| 1440 | depth-donut-chart | ja | Starter · 18.400 EUR · Stand 31.12.2025 | `c68261c5169a04e6` |
| 1440 | depth-line-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `612a2738be0a1b78` |
| 1440 | depth-area-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `1d30acba4367cc6f` |
| 768 | depth-bar-chart | ja | Q1 · 42.000 EUR · Testzeitraum | `11ee2b5a27c19bd4` |
| 768 | depth-hbar-chart | ja | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `ea2b346035c20061` |
| 768 | depth-donut-chart | ja | Starter · 18.400 EUR · Stand 31.12.2025 | `f014fc4cd0e702a8` |
| 768 | depth-line-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `e1ee7b302555be61` |
| 768 | depth-area-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `8e75d3b8772e9381` |
| 375 | depth-bar-chart | ja | Q1 · 42.000 EUR · Testzeitraum | `0072739d599b10f1` |
| 375 | depth-hbar-chart | ja | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `83b4f7a038e14e28` |
| 375 | depth-donut-chart | ja | Starter · 18.400 EUR · Stand 31.12.2025 | `4a09db244a2ea243` |
| 375 | depth-line-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `d416713c4c916d8f` |
| 375 | depth-area-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `d3ea15526438fd85` |

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
| 1440 | 7 | ring | mittel | bereit | `b7c245be3c36e786` |
| 1440 | 8 | ring | mittel | bereit | `72f2d04476884442` |
| 1440 | 9 | kreis | gross | bereit | `5acb7897721d8239` |
| 1440 | 10 | tabelle | mittel | bereit | `0bebcefc222a70fa` |
| 1440 | 11 | balken | mittel | bereit | `b08afcd75c2ebf4e` |
| 1440 | 12 | zahl | mittel | bereit | `f2d3b0dec03d2cbc` |
| 1440 | 13 | saeulen | mittel | bereit | `ad9980ed35634dd7` |
| 1440 | 14 | balken | mittel | bereit | `1698457cd8dc8852` |
| 1440 | 15 | saeulen | mittel | bereit | `49b1b2ce160694d8` |
| 1440 | 16 | ring | mittel | bereit | `a41d751455deea66` |
| 1440 | 17 | linie | mittel | bereit | `226e7456a8cbe7f0` |
| 1440 | 18 | saeulen | mittel | laden | `d63513535bca88f8` |
| 1440 | 19 | zahl | klein | keine_daten | `62f1a8d0202daec6` |
| 1440 | 20 | zahl | klein | fehler | `ee72e325fa7cfb04` |
| 1440 | 21 | zahl | klein | nicht_konfiguriert | `143ce8172f133fdd` |
| 1440 | 22 | zahl | klein | nicht_verfuegbar | `2d1f9cd1de75243e` |
| 1440 | 23 | uebersicht | mittel | bereit | `85f876ff64743601` |
| 1440 | 24 | uebersicht | mittel | bereit | `845fb604ce4d1cae` |
| 1440 | 25 | saeulen | voll | bereit | `871e9432b5ea832e` |
| 768 | 1 | zahl | klein | bereit | `9acc458f1d95c561` |
| 768 | 2 | zahl | klein | veraltet | `599147d4043e7512` |
| 768 | 3 | zahl | klein | offline | `dc02db22048b2470` |
| 768 | 4 | zahl | klein | bereit | `7464a7910f7f9cce` |
| 768 | 5 | linie | mittel | bereit | `4c48be01e29651d2` |
| 768 | 6 | flaeche | mittel | bereit | `7b4fd573731f2847` |
| 768 | 7 | ring | mittel | bereit | `f7f5d9d5a237adab` |
| 768 | 8 | ring | mittel | bereit | `f7f5d9d5a237adab` |
| 768 | 9 | kreis | gross | bereit | `9371af130bfea14b` |
| 768 | 10 | tabelle | mittel | bereit | `abc5e364f910bf37` |
| 768 | 11 | balken | mittel | bereit | `42ac7c264d0d3c35` |
| 768 | 12 | zahl | mittel | bereit | `6280029edbda9ac6` |
| 768 | 13 | saeulen | mittel | bereit | `bb281cdb4e71a744` |
| 768 | 14 | balken | mittel | bereit | `19ebc970fb829f28` |
| 768 | 15 | saeulen | mittel | bereit | `b3169d6f22bd2577` |
| 768 | 16 | ring | mittel | bereit | `fa50cddd6e7614c4` |
| 768 | 17 | linie | mittel | bereit | `15ee885b5804fe81` |
| 768 | 18 | saeulen | mittel | laden | `3261f44bb11eb7d4` |
| 768 | 19 | zahl | klein | keine_daten | `aaca7d0445ebc4bf` |
| 768 | 20 | zahl | klein | fehler | `f876668ccb59c6f0` |
| 768 | 21 | zahl | klein | nicht_konfiguriert | `4d6266d9dc31ae0e` |
| 768 | 22 | zahl | klein | nicht_verfuegbar | `01b6c9a87be1102c` |
| 768 | 23 | uebersicht | mittel | bereit | `98e1ecfb99dca13d` |
| 768 | 24 | uebersicht | mittel | bereit | `268fc94e5025f21d` |
| 768 | 25 | saeulen | voll | bereit | `c7bd77fdecfb7f6c` |
| 375 | 1 | zahl | klein | bereit | `09f2a207151cef13` |
| 375 | 2 | zahl | klein | veraltet | `f376322f29c07f7d` |
| 375 | 3 | zahl | klein | offline | `9bcd147390a6ba7b` |
| 375 | 4 | zahl | klein | bereit | `00f2b08360053b9c` |
| 375 | 5 | linie | mittel | bereit | `a7c6ded7248d2279` |
| 375 | 6 | flaeche | mittel | bereit | `e11b09ee6b537db4` |
| 375 | 7 | ring | mittel | bereit | `41848c17f2f760bd` |
| 375 | 8 | ring | mittel | bereit | `41848c17f2f760bd` |
| 375 | 9 | kreis | gross | bereit | `cced8f525bb07b4b` |
| 375 | 10 | tabelle | mittel | bereit | `c4f2da4f21c65b1a` |
| 375 | 11 | balken | mittel | bereit | `db7b93e492b0bb30` |
| 375 | 12 | zahl | mittel | bereit | `f219aa9dfc6a5535` |
| 375 | 13 | saeulen | mittel | bereit | `4cbabdbce8eef0ca` |
| 375 | 14 | balken | mittel | bereit | `5bde7a39e368bd82` |
| 375 | 15 | saeulen | mittel | bereit | `17016d1de8b3e103` |
| 375 | 16 | ring | mittel | bereit | `be2d9dd530377209` |
| 375 | 17 | linie | mittel | bereit | `fc8965924b25d6ea` |
| 375 | 18 | saeulen | mittel | laden | `b980ecc1b1b3b0f3` |
| 375 | 19 | zahl | klein | keine_daten | `9fe7ba2e2ef77015` |
| 375 | 20 | zahl | klein | fehler | `64b3cb81dafb6064` |
| 375 | 21 | zahl | klein | nicht_konfiguriert | `669db17da5b071b0` |
| 375 | 22 | zahl | klein | nicht_verfuegbar | `b376b9fc3f78c60c` |
| 375 | 23 | uebersicht | mittel | bereit | `75504e14efd4919b` |
| 375 | 24 | uebersicht | mittel | bereit | `691ab3771de12d90` |
| 375 | 25 | saeulen | voll | bereit | `9e5a6f9abc3146c9` |

| Breite | Seitenüberlauf | axe serious/critical |
|---:|---:|---|
| 1440 | 0 px | keine |
| 768 | 0 px | keine |
| 375 | 0 px | keine |
