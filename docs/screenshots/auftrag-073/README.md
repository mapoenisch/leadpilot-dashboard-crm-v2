# Screenshot-Matrix Auftrag 073 (Dashboard Teilauftrag 4, Kachelrahmen und Diagramme)

Erzeugt mit `scripts/captureAuftrag073Screenshots.mjs` gegen zwei Vorschau-Builds (`VITE_DASHBOARD_PREVIEW=true`, `vite preview`): Vorher = Basis `92180d3` (nur Testkachel), Nachher = dieser Stand (Testkachel und Kachelgalerie). Feste Testdaten, `prefers-reduced-motion: reduce`. Bilder bleiben lokal (`.gitignore`, `CLAUDE.md` §7).

- Aufnahme: 2026-10-04T20:33:41.686Z
- Vorher/Nachher-Paare verschieden: ja
- Größter horizontaler Seitenüberlauf: 0 px (auf 375 px scrollt nur das Diagramm innerhalb der Kachel, Designfreigabe)
- axe-Verstöße serious/critical in der Galerie: 0
- Maus-Hover je Diagrammart hebt das Datum hervor und füllt die Ablesezeile: ja
- Höhe gleich (Säulen „mittel“ Laden/fertig, Linie „mittel“ leer/mit Daten, Hinweisplatz aller Live-Kacheln): ja (1440: 450/450 px, Linie leer/voll 405/405 px, Hinweisplatz Live 56 px (4 Kacheln), 768: 481/481 px, Linie leer/voll 436/436 px, Hinweisplatz Live 56 px (4 Kacheln), 375: 450/450 px, Linie leer/voll 405/405 px, Hinweisplatz Live 56 px (4 Kacheln))
- Fokus je Diagrammart füllt die Ablesezeile (Wert, Einheit, Kategorie, Zeitraum): ja
- Netzwerk `?ansicht=zahl`: Testkachel ausgeblendet, geladene Diagrammmodule: keine
- Netzwerk `?ansicht=ring`: Testkachel ausgeblendet, geladene Diagrammmodule: Depth3dDonutChart

## Vorher/Nachher (ganze Seite)

| Breite | Vorher | Nachher | Überlauf nachher |
|---:|---|---|---:|
| 1440 | `3df09d8680ac4ee5` | `a3fc85218afc4b7b` | 0 px |
| 768 | `dc7ff51cb7b59fe2` | `a2f5087847f5431f` | 0 px |
| 375 | `c7d7daa76780cbe9` | `87e42dbbb94aeed9` | 0 px |

## Fokus je Diagrammart (Galerie)

| Breite | Diagramm | Ablesezeile | SHA-256 (gekürzt) |
|---:|---|---|---|
| 1440 | depth-bar-chart | Q1 · 42.000 EUR · Testzeitraum | `53410ca612920d81` |
| 1440 | depth-hbar-chart | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `28270e46a074b125` |
| 1440 | depth-donut-chart | Starter · 18.400 EUR · 29,7 % Anteil · Stand 31.12.2025 | `d19f85265e832048` |
| 1440 | depth-line-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `84143547ff0cfd99` |
| 1440 | depth-area-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `c429c16d11d41bbd` |
| 768 | depth-bar-chart | Q1 · 42.000 EUR · Testzeitraum | `8c732e860107b9e8` |
| 768 | depth-hbar-chart | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `c0c4fb8c3b40cfd5` |
| 768 | depth-donut-chart | Starter · 18.400 EUR · 29,7 % Anteil · Stand 31.12.2025 | `b60c845661899865` |
| 768 | depth-line-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `02431b4c8bf46859` |
| 768 | depth-area-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `50bb7cd5e361202a` |
| 375 | depth-bar-chart | Q1 · 42.000 EUR · Testzeitraum | `183a8693e3972bf8` |
| 375 | depth-hbar-chart | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `6fc38828d11c2960` |
| 375 | depth-donut-chart | Starter · 18.400 EUR · 29,7 % Anteil · Stand 31.12.2025 | `9fd86adcbc4c4c41` |
| 375 | depth-line-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `b96312445b7ee773` |
| 375 | depth-area-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `a2403813c8278896` |

## Maus-Hover je Diagrammart (Galerie)

| Breite | Diagramm | hervorgehoben | Ablesezeile | SHA-256 (gekürzt) |
|---:|---|---|---|---|
| 1440 | depth-bar-chart | ja | Q1 · 42.000 EUR · Testzeitraum | `b5850d5110cbd935` |
| 1440 | depth-hbar-chart | ja | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `31897122eadc8488` |
| 1440 | depth-donut-chart | ja | Starter · 18.400 EUR · 29,7 % Anteil · Stand 31.12.2025 | `aa3438a436c708f7` |
| 1440 | depth-line-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `0f4642961ec8be52` |
| 1440 | depth-area-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `885919a4c241787b` |
| 768 | depth-bar-chart | ja | Q1 · 42.000 EUR · Testzeitraum | `9ad0af3091835a7b` |
| 768 | depth-hbar-chart | ja | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `7e5981723d9ee4c2` |
| 768 | depth-donut-chart | ja | Starter · 18.400 EUR · 29,7 % Anteil · Stand 31.12.2025 | `acb4ea149b15ceab` |
| 768 | depth-line-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `8c2482369ae0e6d4` |
| 768 | depth-area-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `c0a20f7d6022f7af` |
| 375 | depth-bar-chart | ja | Q1 · 42.000 EUR · Testzeitraum | `99c0c36bd4b18965` |
| 375 | depth-hbar-chart | ja | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `dc025108957bd2b0` |
| 375 | depth-donut-chart | ja | Starter · 18.400 EUR · 29,7 % Anteil · Stand 31.12.2025 | `bfdb2446d8f5b432` |
| 375 | depth-line-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `35de121dd770ea95` |
| 375 | depth-area-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `d3e8ca030f42b1f3` |

## Kacheln

Die Ring-Kacheln Nr. 7 und 8 sind absichtlich identisch (getrennte SVG-IDs); gleiche Hashes sind dort erwartet.

| Breite | Nr. | Darstellung | Größe | Zustand | SHA-256 (gekürzt) |
|---:|---:|---|---|---|---|
| 1440 | 1 | zahl | klein | bereit | `b2aa4fbc3748b07e` |
| 1440 | 2 | zahl | klein | veraltet | `0ca4cac690a3fd36` |
| 1440 | 3 | zahl | klein | offline | `c96dbc1f1d44712a` |
| 1440 | 4 | zahl | klein | bereit | `a0d10e3b8fe8b657` |
| 1440 | 5 | linie | mittel | bereit | `6b18047c8551d122` |
| 1440 | 6 | flaeche | mittel | bereit | `fc5bdd3440862557` |
| 1440 | 7 | ring | mittel | bereit | `91c50696e9c4719d` |
| 1440 | 8 | ring | mittel | bereit | `d1d779b8d598fda6` |
| 1440 | 9 | kreis | gross | bereit | `3dd783a520829ddf` |
| 1440 | 10 | tabelle | mittel | bereit | `ba6166078cdd69e4` |
| 1440 | 11 | balken | mittel | bereit | `75e3e713c9bb762b` |
| 1440 | 12 | zahl | mittel | bereit | `ed61a9741158fc4a` |
| 1440 | 13 | saeulen | mittel | bereit | `b76dc9aa92051fe5` |
| 1440 | 14 | balken | mittel | bereit | `97bc5aafbcfc797f` |
| 1440 | 15 | saeulen | mittel | bereit | `44ad35ffac626f9e` |
| 1440 | 16 | ring | mittel | bereit | `b2dac781a7f78d0c` |
| 1440 | 17 | linie | mittel | bereit | `aec644b91d9b5c43` |
| 1440 | 18 | saeulen | mittel | laden | `4927b275d49e2cfc` |
| 1440 | 19 | zahl | klein | keine_daten | `bb5ebf3ac81324cb` |
| 1440 | 20 | zahl | klein | fehler | `6cd2fcbca8cbf32d` |
| 1440 | 21 | zahl | klein | nicht_konfiguriert | `441e1451e704848a` |
| 1440 | 22 | zahl | klein | nicht_verfuegbar | `6176a9ef1ea8392b` |
| 1440 | 23 | uebersicht | mittel | bereit | `560a17051c4448a4` |
| 1440 | 24 | uebersicht | mittel | bereit | `ece1c05f3c0d637c` |
| 1440 | 25 | saeulen | voll | bereit | `03c30a2401421f57` |
| 768 | 1 | zahl | klein | bereit | `eb637fc8238ce5c9` |
| 768 | 2 | zahl | klein | veraltet | `bb41009c5669d747` |
| 768 | 3 | zahl | klein | offline | `c8ed9e2d7785f40d` |
| 768 | 4 | zahl | klein | bereit | `e832bae1a1a7dca8` |
| 768 | 5 | linie | mittel | bereit | `34ee1b81f3fa7744` |
| 768 | 6 | flaeche | mittel | bereit | `0f5c21b8bd061224` |
| 768 | 7 | ring | mittel | bereit | `c9fe6ea5db85f964` |
| 768 | 8 | ring | mittel | bereit | `c9fe6ea5db85f964` |
| 768 | 9 | kreis | gross | bereit | `8a87fa2ac9a58c63` |
| 768 | 10 | tabelle | mittel | bereit | `acdf054088aadc55` |
| 768 | 11 | balken | mittel | bereit | `b8f2908f48a3538e` |
| 768 | 12 | zahl | mittel | bereit | `38aa8aa8acad6119` |
| 768 | 13 | saeulen | mittel | bereit | `bd43904bd282485b` |
| 768 | 14 | balken | mittel | bereit | `46ce1f42dd7c4baa` |
| 768 | 15 | saeulen | mittel | bereit | `a29ce5580757b4b2` |
| 768 | 16 | ring | mittel | bereit | `c7af038a255be752` |
| 768 | 17 | linie | mittel | bereit | `614f5c6cb2962628` |
| 768 | 18 | saeulen | mittel | laden | `d30627d209e8adf4` |
| 768 | 19 | zahl | klein | keine_daten | `6ceac3c95e651859` |
| 768 | 20 | zahl | klein | fehler | `773ce9aa6961b923` |
| 768 | 21 | zahl | klein | nicht_konfiguriert | `32f9994aeec9ff70` |
| 768 | 22 | zahl | klein | nicht_verfuegbar | `0d2700f68e476015` |
| 768 | 23 | uebersicht | mittel | bereit | `b3d9070142ebfae2` |
| 768 | 24 | uebersicht | mittel | bereit | `5e40cfbe39fba7bf` |
| 768 | 25 | saeulen | voll | bereit | `c0c2309848d652da` |
| 375 | 1 | zahl | klein | bereit | `6700b2a297e417f9` |
| 375 | 2 | zahl | klein | veraltet | `723771973767e35d` |
| 375 | 3 | zahl | klein | offline | `5228b845fef0f56e` |
| 375 | 4 | zahl | klein | bereit | `8823762603259514` |
| 375 | 5 | linie | mittel | bereit | `3ddcbec063dce48d` |
| 375 | 6 | flaeche | mittel | bereit | `3ce9305d01f55b56` |
| 375 | 7 | ring | mittel | bereit | `cbede9b1030219ce` |
| 375 | 8 | ring | mittel | bereit | `cbede9b1030219ce` |
| 375 | 9 | kreis | gross | bereit | `3c51f6996590ac28` |
| 375 | 10 | tabelle | mittel | bereit | `109c36788ef0f71f` |
| 375 | 11 | balken | mittel | bereit | `9075283930745188` |
| 375 | 12 | zahl | mittel | bereit | `f954679dd5f81c83` |
| 375 | 13 | saeulen | mittel | bereit | `4cbb73548310197c` |
| 375 | 14 | balken | mittel | bereit | `89b93e7c758cf792` |
| 375 | 15 | saeulen | mittel | bereit | `f98fb7a7621ba565` |
| 375 | 16 | ring | mittel | bereit | `89bf938958c26e18` |
| 375 | 17 | linie | mittel | bereit | `7f3bc59fe5458bce` |
| 375 | 18 | saeulen | mittel | laden | `53df323fea5bf1f7` |
| 375 | 19 | zahl | klein | keine_daten | `29df41417a7841c4` |
| 375 | 20 | zahl | klein | fehler | `a6f51681916f3a1f` |
| 375 | 21 | zahl | klein | nicht_konfiguriert | `fb3a9d20322e75fb` |
| 375 | 22 | zahl | klein | nicht_verfuegbar | `d3492211af41307f` |
| 375 | 23 | uebersicht | mittel | bereit | `187c182aed31ceef` |
| 375 | 24 | uebersicht | mittel | bereit | `46455f4f449223e8` |
| 375 | 25 | saeulen | voll | bereit | `58f2cad4cadfbc0a` |

| Breite | Seitenüberlauf | axe serious/critical |
|---:|---:|---|
| 1440 | 0 px | keine |
| 768 | 0 px | keine |
| 375 | 0 px | keine |
