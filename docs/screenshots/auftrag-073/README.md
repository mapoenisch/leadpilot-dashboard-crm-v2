# Screenshot-Matrix Auftrag 073 (Dashboard Teilauftrag 4, Kachelrahmen und Diagramme)

Erzeugt mit `scripts/captureAuftrag073Screenshots.mjs` gegen zwei Vorschau-Builds (`VITE_DASHBOARD_PREVIEW=true`, `vite preview`): Vorher = Basis `92180d3` (nur Testkachel), Nachher = dieser Stand (Testkachel und Kachelgalerie). Feste Testdaten, `prefers-reduced-motion: reduce`. Bilder bleiben lokal (`.gitignore`, `CLAUDE.md` §7).

- Aufnahme: 2026-10-04T16:57:01.620Z
- Vorher/Nachher-Paare verschieden: ja
- Größter horizontaler Seitenüberlauf: 0 px (auf 375 px scrollt nur das Diagramm innerhalb der Kachel, Designfreigabe)
- axe-Verstöße serious/critical in der Galerie: 0
- Maus-Hover je Diagrammart hebt das Datum hervor und füllt die Ablesezeile: ja
- Inhaltshöhe gleich (Säulen „mittel“ Laden/fertig, Linie „mittel“ leer/mit Daten): ja (1440: 450/450 px, Linie leer/voll 405/405 px, 768: 481/481 px, Linie leer/voll 436/436 px, 375: 450/450 px, Linie leer/voll 405/405 px)
- Fokus je Diagrammart füllt die Ablesezeile (Wert, Einheit, Kategorie, Zeitraum): ja
- Netzwerk `?ansicht=zahl`: Testkachel ausgeblendet, geladene Diagrammmodule: keine
- Netzwerk `?ansicht=ring`: Testkachel ausgeblendet, geladene Diagrammmodule: Depth3dDonutChart

## Vorher/Nachher (ganze Seite)

| Breite | Vorher | Nachher | Überlauf nachher |
|---:|---|---|---:|
| 1440 | `3df09d8680ac4ee5` | `99b590fd45ae89eb` | 0 px |
| 768 | `dc7ff51cb7b59fe2` | `4aedb927e57c3df6` | 0 px |
| 375 | `ad429e1a37a88aed` | `147e1218794891ba` | 0 px |

## Fokus je Diagrammart (Galerie)

| Breite | Diagramm | Ablesezeile | SHA-256 (gekürzt) |
|---:|---|---|---|
| 1440 | depth-bar-chart | Q1 · 42.000 EUR · Testzeitraum | `f5cde40f3f03f863` |
| 1440 | depth-hbar-chart | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `0d08a11818b8fef4` |
| 1440 | depth-donut-chart | Starter · 18.400 EUR · 29,7 % Anteil · Stand 31.12.2025 | `208094b358a227c6` |
| 1440 | depth-line-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `5862a50e77743b04` |
| 1440 | depth-area-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `6252dcf0f933679d` |
| 768 | depth-bar-chart | Q1 · 42.000 EUR · Testzeitraum | `648e0462e0926eaf` |
| 768 | depth-hbar-chart | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `6f2bc7288139cf3f` |
| 768 | depth-donut-chart | Starter · 18.400 EUR · 29,7 % Anteil · Stand 31.12.2025 | `15ea568ea33bfc18` |
| 768 | depth-line-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `e456e9560432616c` |
| 768 | depth-area-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `b28d9cad051bc0f1` |
| 375 | depth-bar-chart | Q1 · 42.000 EUR · Testzeitraum | `e90a154febac0879` |
| 375 | depth-hbar-chart | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `7922b32587c4f388` |
| 375 | depth-donut-chart | Starter · 18.400 EUR · 29,7 % Anteil · Stand 31.12.2025 | `fb7610cc5dc35384` |
| 375 | depth-line-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `811e89184d8bb7e4` |
| 375 | depth-area-chart | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `cff092238b8cab9d` |

## Maus-Hover je Diagrammart (Galerie)

| Breite | Diagramm | hervorgehoben | Ablesezeile | SHA-256 (gekürzt) |
|---:|---|---|---|---|
| 1440 | depth-bar-chart | ja | Q1 · 42.000 EUR · Testzeitraum | `b71077f8a1c72b45` |
| 1440 | depth-hbar-chart | ja | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `5d54abe7f291fc13` |
| 1440 | depth-donut-chart | ja | Starter · 18.400 EUR · 29,7 % Anteil · Stand 31.12.2025 | `fb1ca4db6d52fa57` |
| 1440 | depth-line-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `caa20679c0fd9414` |
| 1440 | depth-area-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `bd904b7e511d8674` |
| 768 | depth-bar-chart | ja | Q1 · 42.000 EUR · Testzeitraum | `6f4f8b703fd15c5f` |
| 768 | depth-hbar-chart | ja | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `cb32a8b47b50cb7c` |
| 768 | depth-donut-chart | ja | Starter · 18.400 EUR · 29,7 % Anteil · Stand 31.12.2025 | `522d0485cb3b870d` |
| 768 | depth-line-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `b0767eba2a1880c8` |
| 768 | depth-area-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `67f1463a6adcbc46` |
| 375 | depth-bar-chart | ja | Q1 · 42.000 EUR · Testzeitraum | `03722deb8cb2a2aa` |
| 375 | depth-hbar-chart | ja | Lead · 420.000 EUR · Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. | `19d1f40e1226b006` |
| 375 | depth-donut-chart | ja | Starter · 18.400 EUR · 29,7 % Anteil · Stand 31.12.2025 | `5d1e2790d7a62eea` |
| 375 | depth-line-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `1b8f084b0f9b5814` |
| 375 | depth-area-chart | ja | Q1 2024 · 410.000 EUR · Quartalsende Q1 2024 bis Q4 2025 | `695c4fbb879aee76` |

## Kacheln

Die Ring-Kacheln Nr. 7 und 8 sind absichtlich identisch (getrennte SVG-IDs); gleiche Hashes sind dort erwartet.

| Breite | Nr. | Darstellung | Größe | Zustand | SHA-256 (gekürzt) |
|---:|---:|---|---|---|---|
| 1440 | 1 | zahl | klein | bereit | `f068b39e457baa41` |
| 1440 | 2 | zahl | klein | veraltet | `250a5d7c1b46a336` |
| 1440 | 3 | zahl | klein | offline | `f472d904d087e0dd` |
| 1440 | 4 | zahl | klein | bereit | `56e858c811c4f2b5` |
| 1440 | 5 | linie | mittel | bereit | `bd8127a6904292bd` |
| 1440 | 6 | flaeche | mittel | bereit | `d4cc303a61620d48` |
| 1440 | 7 | ring | mittel | bereit | `f9c1be2a46218822` |
| 1440 | 8 | ring | mittel | bereit | `596ca02369522a46` |
| 1440 | 9 | kreis | gross | bereit | `d2b5f9d1a429a979` |
| 1440 | 10 | tabelle | mittel | bereit | `21c455d57883079d` |
| 1440 | 11 | balken | mittel | bereit | `6a1214095a3f02c2` |
| 1440 | 12 | zahl | mittel | bereit | `6d5ed6ca045ae362` |
| 1440 | 13 | saeulen | mittel | bereit | `9bfd1447e7060a4e` |
| 1440 | 14 | balken | mittel | bereit | `82579e86ebd496e7` |
| 1440 | 15 | saeulen | mittel | bereit | `289e8475c748e5a3` |
| 1440 | 16 | ring | mittel | bereit | `b99ecf384e8e7f1e` |
| 1440 | 17 | linie | mittel | bereit | `7799b47988e24547` |
| 1440 | 18 | saeulen | mittel | laden | `d068a99a38072732` |
| 1440 | 19 | zahl | klein | keine_daten | `4d6621d79a460a67` |
| 1440 | 20 | zahl | klein | fehler | `ef0ff8426ae93f3d` |
| 1440 | 21 | zahl | klein | nicht_konfiguriert | `143ce8172f133fdd` |
| 1440 | 22 | zahl | klein | nicht_verfuegbar | `2d1f9cd1de75243e` |
| 1440 | 23 | uebersicht | mittel | bereit | `85f876ff64743601` |
| 1440 | 24 | uebersicht | mittel | bereit | `913ef7863d3b0560` |
| 1440 | 25 | saeulen | voll | bereit | `c1351b862f7cd0de` |
| 768 | 1 | zahl | klein | bereit | `9acc458f1d95c561` |
| 768 | 2 | zahl | klein | veraltet | `599147d4043e7512` |
| 768 | 3 | zahl | klein | offline | `dc02db22048b2470` |
| 768 | 4 | zahl | klein | bereit | `7464a7910f7f9cce` |
| 768 | 5 | linie | mittel | bereit | `7c7c91a6bc579138` |
| 768 | 6 | flaeche | mittel | bereit | `9f50c3e4fe46cb53` |
| 768 | 7 | ring | mittel | bereit | `8504fbf1f9555261` |
| 768 | 8 | ring | mittel | bereit | `8504fbf1f9555261` |
| 768 | 9 | kreis | gross | bereit | `579303050adfbbdc` |
| 768 | 10 | tabelle | mittel | bereit | `abc5e364f910bf37` |
| 768 | 11 | balken | mittel | bereit | `62dc08ecf7962c06` |
| 768 | 12 | zahl | mittel | bereit | `6280029edbda9ac6` |
| 768 | 13 | saeulen | mittel | bereit | `d3cda72d6a7dd817` |
| 768 | 14 | balken | mittel | bereit | `ca69b4f057f729e9` |
| 768 | 15 | saeulen | mittel | bereit | `782101c6a0ed637e` |
| 768 | 16 | ring | mittel | bereit | `f36767ca205e9752` |
| 768 | 17 | linie | mittel | bereit | `553a6a57816ee625` |
| 768 | 18 | saeulen | mittel | laden | `639cfcdba1bbbaa8` |
| 768 | 19 | zahl | klein | keine_daten | `aaca7d0445ebc4bf` |
| 768 | 20 | zahl | klein | fehler | `f876668ccb59c6f0` |
| 768 | 21 | zahl | klein | nicht_konfiguriert | `4d6266d9dc31ae0e` |
| 768 | 22 | zahl | klein | nicht_verfuegbar | `01b6c9a87be1102c` |
| 768 | 23 | uebersicht | mittel | bereit | `98e1ecfb99dca13d` |
| 768 | 24 | uebersicht | mittel | bereit | `5649078361b548ae` |
| 768 | 25 | saeulen | voll | bereit | `ab43098a0e92c945` |
| 375 | 1 | zahl | klein | bereit | `09f2a207151cef13` |
| 375 | 2 | zahl | klein | veraltet | `f376322f29c07f7d` |
| 375 | 3 | zahl | klein | offline | `9bcd147390a6ba7b` |
| 375 | 4 | zahl | klein | bereit | `00f2b08360053b9c` |
| 375 | 5 | linie | mittel | bereit | `6990c0d0fc3a18bf` |
| 375 | 6 | flaeche | mittel | bereit | `688c329d7ce21a82` |
| 375 | 7 | ring | mittel | bereit | `a6ef0926602fd84d` |
| 375 | 8 | ring | mittel | bereit | `a6ef0926602fd84d` |
| 375 | 9 | kreis | gross | bereit | `f3b9f20a83863a4e` |
| 375 | 10 | tabelle | mittel | bereit | `c4f2da4f21c65b1a` |
| 375 | 11 | balken | mittel | bereit | `5ec1137e13d898ba` |
| 375 | 12 | zahl | mittel | bereit | `f219aa9dfc6a5535` |
| 375 | 13 | saeulen | mittel | bereit | `ef9adc4207cf09a6` |
| 375 | 14 | balken | mittel | bereit | `d98855c994b43fc1` |
| 375 | 15 | saeulen | mittel | bereit | `8a20c820d55b7503` |
| 375 | 16 | ring | mittel | bereit | `0cecbb0475b38717` |
| 375 | 17 | linie | mittel | bereit | `da1dc9b0cc0b5eb9` |
| 375 | 18 | saeulen | mittel | laden | `effd59d4820e0f0d` |
| 375 | 19 | zahl | klein | keine_daten | `9fe7ba2e2ef77015` |
| 375 | 20 | zahl | klein | fehler | `64b3cb81dafb6064` |
| 375 | 21 | zahl | klein | nicht_konfiguriert | `669db17da5b071b0` |
| 375 | 22 | zahl | klein | nicht_verfuegbar | `b376b9fc3f78c60c` |
| 375 | 23 | uebersicht | mittel | bereit | `75504e14efd4919b` |
| 375 | 24 | uebersicht | mittel | bereit | `691ab3771de12d90` |
| 375 | 25 | saeulen | voll | bereit | `ff3fc472d731738b` |

| Breite | Seitenüberlauf | axe serious/critical |
|---:|---:|---|
| 1440 | 0 px | keine |
| 768 | 0 px | keine |
| 375 | 0 px | keine |
