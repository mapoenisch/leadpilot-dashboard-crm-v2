# Auftrag 133: Screenshot-Gate-Nachweis

**Route:** `/finance/unit-economics`
**Baseline:** `1592fcd` (origin/main Build in `/tmp/leadpilot-baseline-133/dist`) auf Port 3001
**Nachher:** `claude/auftrag-133-what-if-hebelrechner` (Head Build) auf Port 3000
**Datum:** 2026-11-07
**Ergebnis:** 18/18 Bildpaare mit beabsichtigter Änderung, maximaler Überlauf: **0 px**.
**Status:** **PASS**

## Screenshot-Vergleichsmatrix

| Szenario | Breite | Theme | Vorher SHA-256 (1592fcd) | Nachher SHA-256 (Head) | Diff? | Überlauf Vorher | Überlauf Nachher | Status |
|---|---|---|---|---|---|---|---|---|
| `unit-economics-standard` | 1440 px | dark | `a8f357cced3c…` | `de4745558b6f…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-standard` | 768 px | dark | `200ccb73e612…` | `d72fe8f3a88c…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-standard` | 375 px | dark | `c2afd5ac7999…` | `037f5f6ab748…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-standard` | 1440 px | light | `7e8e9997f074…` | `6ddece763c16…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-standard` | 768 px | light | `72199be3fa69…` | `5632848b9097…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-standard` | 375 px | light | `3b2535da9613…` | `d79f31b4d73a…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-growth-preset` | 1440 px | dark | `a8f357cced3c…` | `3930d3c1ea53…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-growth-preset` | 768 px | dark | `200ccb73e612…` | `5294e1e355cb…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-growth-preset` | 375 px | dark | `c2afd5ac7999…` | `7bc0bde0be65…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-growth-preset` | 1440 px | light | `7e8e9997f074…` | `04dcbbf66544…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-growth-preset` | 768 px | light | `72199be3fa69…` | `84636da7607a…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-growth-preset` | 375 px | light | `06a1051337d2…` | `6f369dbe083b…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-tables` | 1440 px | dark | `a8f357cced3c…` | `db785dd12b08…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-tables` | 768 px | dark | `200ccb73e612…` | `86438cf95221…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-tables` | 375 px | dark | `c2afd5ac7999…` | `e39b7451f7c7…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-tables` | 1440 px | light | `7e8e9997f074…` | `279fc1a17761…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-tables` | 768 px | light | `72199be3fa69…` | `810c150bf986…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-tables` | 375 px | light | `3b2535da9613…` | `a113f186b224…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |


## Fazit

- Gerenderte Bildpaare: 18/18 (Vollständig).
- Visuelle Differenz: 18/18 Bildpaare mit beabsichtigter Änderung (100% geändert).
- Überlauf über alle Viewports und Themes: **exakt 0 px** (kein horizontaler Überlauf).
- Gate-Gesamtergebnis: **PASS**.
