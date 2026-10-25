# Auftrag 107 – Screenshot-Matrix (Paket H Teil 3)

Skript: `scripts/captureAuftrag107Screenshots.mjs` (SUPABASE_MOCK=1). Vorher = `main` (081e131), Nachher = Branch `claude/auftrag-107-paket-h-teil3`. Bilder lokal, nicht committet.

| Ansicht | Breite | SHA vorher | SHA nachher | verschieden | Überlauf px vorher / nachher |
| --- | --- | --- | --- | --- | --- |
| /dashboard | 1440 | 91a8742f16fa | b7d9531e04de | ja | 0 / 0 |
| /companies | 1440 | 2898eb570929 | 6abaf52b8aa7 | ja | 0 / 0 |
| /headcount | 1440 | fcf4942867e6 | e7ac29bac50c | ja | 0 / 0 |
| /team | 1440 | ef6c58ddefbb | eaeb5c812152 | ja | 0 / 0 |
| /unit-economics | 1440 | de212a6d5477 | efd2106db446 | ja | 0 / 0 |
| /live-simulation | 1440 | 94b3a532fe0d | 0a750afafba7 | ja | 0 / 0 |
| /dashboard | 768 | 68ee95d51c46 | b3919c14e670 | ja | 0 / 0 |
| /companies | 768 | ca0bcae8371b | e480658776db | ja | 0 / 0 |
| /headcount | 768 | 59649fa6976d | c6227cbe31d9 | ja | 0 / 0 |
| /team | 768 | 0bbf019ef753 | 93e1ce89f3e0 | ja | 0 / 0 |
| /unit-economics | 768 | fddbc8a4c503 | e271abf6d655 | ja | 0 / 0 |
| /live-simulation | 768 | e7c72e593e4f | 3725bc39e8b5 | ja | 0 / 0 |
| /dashboard | 375 | 128faf677a2c | 128faf677a2c | nein | 0 / 0 |
| /companies | 375 | e87e10e18fb5 | e435e6cd563e | ja | 0 / 0 |
| /headcount | 375 | b2cfef1e52d3 | 05eff2d73320 | ja | 86 / 86 |
| /team | 375 | 75f16da5d848 | bfefe7e3363f | ja | 0 / 0 |
| /unit-economics | 375 | 624e02792158 | 624e02792158 | nein | 0 / 0 |
| /live-simulation | 375 | 592140901e94 | 301e90863558 | ja | 184 / 184 |

**Begründete Gleichstände:** `/dashboard @375` und `/unit-economics @375` zeigen im ersten Bildschirm keine geänderte Beschriftung (Badges bzw. Kennzahlkarte liegen unterhalb). `Fully-Loaded CAC` auf Unit Economics stammt aus `src/domain/finanzenData.ts` (Daten, außerhalb der Grenze) → Teil 4.

**Überlauf:** `/headcount @375` (86 px) und `/live-simulation @375` (184 px) bestehen unverändert schon auf `main`; eigener Befund, nicht durch diesen Auftrag verursacht.
