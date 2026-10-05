# Screenshot-Matrix Auftrag 076 (Dashboard Teilauftrag 6, geführte KPI-Kombinationen)

Erzeugt mit `scripts/captureAuftrag076Screenshots.mjs` gegen zwei Vorschau-Builds (`VITE_DASHBOARD_PREVIEW=true`, `vite preview`): Vorher = Basis `4088ee3` (ohne Kombinationen), Nachher = dieser Stand. Testdaten (Kombinationen über `computeCombination`, CAC-Aufschlag absichtlich mit Nenner 0), Speicher-Ersatz im Arbeitsspeicher, `prefers-reduced-motion: reduce`. Bilder bleiben lokal (`.gitignore`, `CLAUDE.md` §7).

- Aufnahme: 2026-10-05T19:10:51.846Z
- Vorher/Nachher-Paare verschieden: ja
- Größter horizontaler Seitenüberlauf: 0 px
- axe-Verstöße serious/critical: 0
- Kombinationskacheln in der Ansicht (Zustand/Darstellung/Badge): bereit/zahl/–, nicht_berechenbar/zahl/Nicht berechenbar, bereit/ring/–
- Ansage nach erster Kennzahl: „1 Kombination mit einer zweiten Kennzahl möglich.“
- Gesperrter Partner deaktiviert: ja; Text: „ARRNicht kombinierbar: Unterschiedliche Zeitbasis (Geschäftsjahr 2025 und Stand 31.12.2025).“
- Ansage nach Wahl (Pfeiltaste): „Kombination „EBITDA-Marge“ gewählt: EBITDA ÷ Umsatzerlöse × 100.“; Fokus danach auf: „EBITDA-Marge (mit EBITDA)Formel: EBITDA ÷ Umsatzerlöse × 100. EBITDA im Verhältnis zu den Umsatzerlösen desselben Geschäftsjahres; bei negativem EBITDA ist die Marge negativ.“
- Formel in der Vorschau: „Formel: EBITDA ÷ Umsatzerlöse × 100“
- Ansage beim Wechsel der ersten Kennzahl: „Kombination „EBITDA-Marge“ verworfen, weil die erste Kennzahl wechselte. 1 Kombination mit einer zweiten Kennzahl möglich.“; Formelzeilen danach in der Vorschau: 0
- Hinzufügen per Tastatur: Kacheln 1440: 17→18, 768: 17→18, 375: 17→18
- Nicht berechenbar (Vorschau): „„Marketing-CAC“ ist 0; durch 0 lässt sich nicht teilen.“
- Escape schließt den Konfigurator (oberster Dialog): ja
- Speichern: „Gespeichert.“ und Rückkehr in die Ansicht: ja; Kombinationskacheln danach: bereit

- Höhe ganzer Kacheln bei 24 Kacheln, Laden → Endzustand (Abweichungen je Breite): 1440: 24 Kacheln, Endzustände bereit/nicht_berechenbar, Abweichungen 0, Raster 4024/4024 px; 768: 24 Kacheln, Endzustände bereit/nicht_berechenbar, Abweichungen 0, Raster 7106/7106 px; 375: 24 Kacheln, Endzustände bereit/nicht_berechenbar, Abweichungen 0, Raster 10307/10307 px
- Kombinationskacheln (Laden/Ende in px): 1440: kombi_marge 475/475, kombi_cac 475/475, kombi_growth 707/707; 768: kombi_marge 371/371, kombi_cac 371/371, kombi_growth 738/738; 375: kombi_marge 371/371, kombi_cac 371/371, kombi_growth 725/725
- Höchstbelegung 24 Kacheln, aktiv beim Start / nach dem Scrollen: 1440: 10/24 von 24, 768: 6/24 von 24, 375: 2/24 von 24

## Vorher/Nachher (ganze Seite, 24 Kacheln)

| Breite | Vorher | Nachher | Überlauf nachher |
|---:|---|---|---:|
| 1440 | `1cc33935d6932d27` | `286630f442dfc5fb` | 0 px |
| 768 | `e297d03a79ce66e0` | `3edad571cd45be34` | 0 px |
| 375 | `d8691292a1840407` | `2b37c318d55ffda6` | 0 px |

## Zustände

| Breite | Zustand | Überlauf | axe serious/critical | SHA-256 (gekürzt) |
|---:|---|---:|---|---|
| 1440 | ansicht-24 | 0 px | keine | `286630f442dfc5fb` |
| 1440 | bearbeiten | 0 px | keine | `99271d7f96c7715f` |
| 1440 | gesperrter-partner | 0 px | keine | `ae6f1ac00366381a` |
| 1440 | konfigurator-kombination | 0 px | keine | `78822c82c0801e89` |
| 1440 | nicht-berechenbar | 0 px | keine | `54796cd5bdb095f7` |
| 1440 | ansicht-gespeichert | 0 px | keine | `f0e988ef76b06410` |
| 768 | ansicht-24 | 0 px | keine | `3edad571cd45be34` |
| 768 | bearbeiten | 0 px | keine | `b50b209ad4063f3d` |
| 768 | gesperrter-partner | 0 px | keine | `e3a45b711ba0e2c5` |
| 768 | konfigurator-kombination | 0 px | keine | `90b9314004f14816` |
| 768 | nicht-berechenbar | 0 px | keine | `747df10fe4ef2ba4` |
| 768 | ansicht-gespeichert | 0 px | keine | `ecfa04969b7b4970` |
| 375 | ansicht-24 | 0 px | keine | `2b37c318d55ffda6` |
| 375 | bearbeiten | 0 px | keine | `99ae14c3adee9a0c` |
| 375 | gesperrter-partner | 0 px | keine | `ff3107f81c32017e` |
| 375 | konfigurator-kombination | 0 px | keine | `81c2cf8f11238491` |
| 375 | nicht-berechenbar | 0 px | keine | `11d44936aea63e90` |
| 375 | ansicht-gespeichert | 0 px | keine | `cd42efb1226ea57a` |
