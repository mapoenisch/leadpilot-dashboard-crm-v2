# Screenshot-Matrix Auftrag 073 (Dashboard Teilauftrag 4, Kachelrahmen und Diagramme)

Erzeugt mit `scripts/captureAuftrag073Screenshots.mjs` gegen zwei Vorschau-Builds (`VITE_DASHBOARD_PREVIEW=true`, `vite preview`): Vorher = Basis `92180d3` (nur Testkachel), Nachher = dieser Stand (Testkachel und Kachelgalerie). Feste Testdaten, `prefers-reduced-motion: reduce`. Bilder bleiben lokal (`.gitignore`, `CLAUDE.md` §7).

- Aufnahme: 2026-10-04T15:56:50.736Z
- Vorher/Nachher-Paare verschieden: ja
- Größter horizontaler Seitenüberlauf: 0 px (auf 375 px scrollt nur das Diagramm innerhalb der Kachel, Designfreigabe)
- axe-Verstöße serious/critical in der Galerie: 0
- Maus-Hover je Diagrammart hebt das Datum hervor und füllt die Ablesezeile: ja
- Säulenkachel „mittel“: Inhaltshöhe beim Laden = fertig: ja (1440: 430/430 px, 768: 461/461 px, 375: 430/430 px)
- Fokus je Diagrammart füllt die Ablesezeile (Wert, Einheit, Kategorie, Zeitraum): ja
- Netzwerk `?ansicht=zahl`: Testkachel ausgeblendet, geladene Diagrammmodule: keine
- Netzwerk `?ansicht=ring`: Testkachel ausgeblendet, geladene Diagrammmodule: Depth3dDonutChart

## Vorher/Nachher (ganze Seite)

| Breite | Vorher | Nachher | Überlauf nachher |
|---:|---|---|---:|
| 1440 | `3df09d8680ac4ee5` | `c6ef675247ca20ea` | 0 px |
| 768 | `dc7ff51cb7b59fe2` | `b54dbd414ea6c69a` | 0 px |
| 375 | `ad429e1a37a88aed` | `2d0a9c629da5045f` | 0 px |

## Fokus je Diagrammart (Galerie)

| Breite | Diagramm | Ablesezeile | SHA-256 (gekürzt) |
|---:|---|---|---|
| 1440 | depth-bar-chart | Q1 · 42.000 EUR · Testzeitraum | `823be66f292767bc` |
| 1440 | depth-hbar-chart | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `8005be2cdd1010cc` |
| 1440 | depth-donut-chart | Starter · 18.400 EUR · Stand 31.12.2025 | `185db81cad94d419` |
| 1440 | depth-line-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `90b6b5e0434069fe` |
| 1440 | depth-area-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `bf14ac82a1dcc6e9` |
| 768 | depth-bar-chart | Q1 · 42.000 EUR · Testzeitraum | `b312da8ab12e8e56` |
| 768 | depth-hbar-chart | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `0541ca54a7a7401f` |
| 768 | depth-donut-chart | Starter · 18.400 EUR · Stand 31.12.2025 | `98cbfa6b9548822d` |
| 768 | depth-line-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `bedf316660e6f3d5` |
| 768 | depth-area-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `8a9b7156abf8e274` |
| 375 | depth-bar-chart | Q1 · 42.000 EUR · Testzeitraum | `a4d06e23ccca26cf` |
| 375 | depth-hbar-chart | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `0ef6e39c145ccbf8` |
| 375 | depth-donut-chart | Starter · 18.400 EUR · Stand 31.12.2025 | `0b499ea1fa36d8de` |
| 375 | depth-line-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `4ec5d1e7ea8992a0` |
| 375 | depth-area-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `d6ab2ac7578746a5` |

## Maus-Hover je Diagrammart (Galerie)

| Breite | Diagramm | hervorgehoben | Ablesezeile | SHA-256 (gekürzt) |
|---:|---|---|---|---|
| 1440 | depth-bar-chart | ja | Q1 · 42.000 EUR · Testzeitraum | `2530cb9e38bb33ef` |
| 1440 | depth-hbar-chart | ja | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `0edc54c936e050f0` |
| 1440 | depth-donut-chart | ja | Starter · 18.400 EUR · Stand 31.12.2025 | `aad42dbd116c16c0` |
| 1440 | depth-line-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `612a2738be0a1b78` |
| 1440 | depth-area-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `1d30acba4367cc6f` |
| 768 | depth-bar-chart | ja | Q1 · 42.000 EUR · Testzeitraum | `14212de06914f63c` |
| 768 | depth-hbar-chart | ja | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `f8526bef919e1c39` |
| 768 | depth-donut-chart | ja | Starter · 18.400 EUR · Stand 31.12.2025 | `34c5744b3d3e727a` |
| 768 | depth-line-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `e1ee7b302555be61` |
| 768 | depth-area-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `8e75d3b8772e9381` |
| 375 | depth-bar-chart | ja | Q1 · 42.000 EUR · Testzeitraum | `838a67bd88e44a16` |
| 375 | depth-hbar-chart | ja | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `2d2382703859d8dc` |
| 375 | depth-donut-chart | ja | Starter · 18.400 EUR · Stand 31.12.2025 | `4daa95287ebdde5b` |
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
| 1440 | 7 | ring | mittel | bereit | `884468d673da5e2d` |
| 1440 | 8 | ring | mittel | bereit | `368459758d3ed6f2` |
| 1440 | 9 | kreis | gross | bereit | `40e17bb131d91823` |
| 1440 | 10 | tabelle | mittel | bereit | `0bebcefc222a70fa` |
| 1440 | 11 | balken | mittel | bereit | `32c7970b307b4007` |
| 1440 | 12 | zahl | mittel | bereit | `f2d3b0dec03d2cbc` |
| 1440 | 13 | saeulen | mittel | bereit | `35859bb47cedb4a1` |
| 1440 | 14 | balken | mittel | bereit | `877710ac474aeffa` |
| 1440 | 15 | saeulen | mittel | bereit | `e3edddd62a751eb4` |
| 1440 | 16 | ring | mittel | bereit | `898a21d3d06a8160` |
| 1440 | 17 | linie | mittel | bereit | `a460e07c3689bcc6` |
| 1440 | 18 | saeulen | mittel | laden | `deb0909335f04448` |
| 1440 | 19 | zahl | klein | keine_daten | `aa71b33e3a7372af` |
| 1440 | 20 | zahl | klein | fehler | `da082a038eddc3bf` |
| 1440 | 21 | zahl | klein | nicht_konfiguriert | `d40c8fed08f76a2c` |
| 1440 | 22 | zahl | klein | nicht_verfuegbar | `bac4f2755e5df847` |
| 1440 | 23 | uebersicht | mittel | bereit | `cbc8219c0669202a` |
| 1440 | 24 | uebersicht | mittel | bereit | `c35d146ec4cd385c` |
| 1440 | 25 | saeulen | voll | bereit | `d697ccd358629be6` |
| 768 | 1 | zahl | klein | bereit | `9acc458f1d95c561` |
| 768 | 2 | zahl | klein | veraltet | `599147d4043e7512` |
| 768 | 3 | zahl | klein | offline | `dc02db22048b2470` |
| 768 | 4 | zahl | klein | bereit | `7464a7910f7f9cce` |
| 768 | 5 | linie | mittel | bereit | `4c48be01e29651d2` |
| 768 | 6 | flaeche | mittel | bereit | `7b4fd573731f2847` |
| 768 | 7 | ring | mittel | bereit | `b9c983ae203f31cc` |
| 768 | 8 | ring | mittel | bereit | `b9c983ae203f31cc` |
| 768 | 9 | kreis | gross | bereit | `8dfb4429b1a1acb3` |
| 768 | 10 | tabelle | mittel | bereit | `abc5e364f910bf37` |
| 768 | 11 | balken | mittel | bereit | `02c3ca7c4a46b040` |
| 768 | 12 | zahl | mittel | bereit | `6280029edbda9ac6` |
| 768 | 13 | saeulen | mittel | bereit | `ec79e024d930d6ac` |
| 768 | 14 | balken | mittel | bereit | `073bd1fbadf94811` |
| 768 | 15 | saeulen | mittel | bereit | `785b2067b1e422f5` |
| 768 | 16 | ring | mittel | bereit | `3564f64fdb9f56d7` |
| 768 | 17 | linie | mittel | bereit | `6add4f8034b245e1` |
| 768 | 18 | saeulen | mittel | laden | `26b36b9380ebbfe8` |
| 768 | 19 | zahl | klein | keine_daten | `b418ed0a946760d3` |
| 768 | 20 | zahl | klein | fehler | `12b9a35e42502cba` |
| 768 | 21 | zahl | klein | nicht_konfiguriert | `6eff8090dc3f1002` |
| 768 | 22 | zahl | klein | nicht_verfuegbar | `a9dbad0a7c17c2ed` |
| 768 | 23 | uebersicht | mittel | bereit | `98e1ecfb99dca13d` |
| 768 | 24 | uebersicht | mittel | bereit | `268fc94e5025f21d` |
| 768 | 25 | saeulen | voll | bereit | `6d740497c3cc388c` |
| 375 | 1 | zahl | klein | bereit | `09f2a207151cef13` |
| 375 | 2 | zahl | klein | veraltet | `f376322f29c07f7d` |
| 375 | 3 | zahl | klein | offline | `9bcd147390a6ba7b` |
| 375 | 4 | zahl | klein | bereit | `00f2b08360053b9c` |
| 375 | 5 | linie | mittel | bereit | `a7c6ded7248d2279` |
| 375 | 6 | flaeche | mittel | bereit | `e11b09ee6b537db4` |
| 375 | 7 | ring | mittel | bereit | `1259afb0bb856320` |
| 375 | 8 | ring | mittel | bereit | `1259afb0bb856320` |
| 375 | 9 | kreis | gross | bereit | `ded774a498e1e42c` |
| 375 | 10 | tabelle | mittel | bereit | `c4f2da4f21c65b1a` |
| 375 | 11 | balken | mittel | bereit | `931009e49ba52d94` |
| 375 | 12 | zahl | mittel | bereit | `f219aa9dfc6a5535` |
| 375 | 13 | saeulen | mittel | bereit | `b16ca6faf184d912` |
| 375 | 14 | balken | mittel | bereit | `3b2f35a9b56aedcd` |
| 375 | 15 | saeulen | mittel | bereit | `cad861def91fb4a8` |
| 375 | 16 | ring | mittel | bereit | `0282ac12054b199a` |
| 375 | 17 | linie | mittel | bereit | `4f07b035bbd6c800` |
| 375 | 18 | saeulen | mittel | laden | `e8f489ed17242ca2` |
| 375 | 19 | zahl | klein | keine_daten | `01290ed380f86b0c` |
| 375 | 20 | zahl | klein | fehler | `9f3d94ac117c0c14` |
| 375 | 21 | zahl | klein | nicht_konfiguriert | `232de4d5677c6ea2` |
| 375 | 22 | zahl | klein | nicht_verfuegbar | `f963c13d6701d0b4` |
| 375 | 23 | uebersicht | mittel | bereit | `36ac355288c74ae4` |
| 375 | 24 | uebersicht | mittel | bereit | `36c46f6370f24cfe` |
| 375 | 25 | saeulen | voll | bereit | `ec26eed3ec153cae` |

| Breite | Seitenüberlauf | axe serious/critical |
|---:|---:|---|
| 1440 | 0 px | keine |
| 768 | 0 px | keine |
| 375 | 0 px | keine |
