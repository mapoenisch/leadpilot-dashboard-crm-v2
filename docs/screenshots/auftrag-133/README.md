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
| `unit-economics-standard` | 1440 px | dark | `a8f357cced3c…` | `095449b6d642…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-standard` | 768 px | dark | `200ccb73e612…` | `c52ec628cb29…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-standard` | 375 px | dark | `c2afd5ac7999…` | `406f2f5cb540…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-standard` | 1440 px | light | `7e8e9997f074…` | `8ab4d4cfc468…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-standard` | 768 px | light | `72199be3fa69…` | `a9f77da353dc…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-standard` | 375 px | light | `3b2535da9613…` | `aff767966ab5…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-growth-preset` | 1440 px | dark | `a8f357cced3c…` | `f87a1bf1a179…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-growth-preset` | 768 px | dark | `200ccb73e612…` | `5294e1e355cb…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-growth-preset` | 375 px | dark | `c2afd5ac7999…` | `3b7cebf78cc5…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-growth-preset` | 1440 px | light | `7e8e9997f074…` | `5b7669185d1b…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-growth-preset` | 768 px | light | `72199be3fa69…` | `84636da7607a…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-growth-preset` | 375 px | light | `06a1051337d2…` | `428130a9864d…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-tables` | 1440 px | dark | `a8f357cced3c…` | `91fdd2964060…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-tables` | 768 px | dark | `200ccb73e612…` | `ac8375db9762…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-tables` | 375 px | dark | `c2afd5ac7999…` | `648675911406…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-tables` | 1440 px | light | `7e8e9997f074…` | `98109afd3b77…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-tables` | 768 px | light | `72199be3fa69…` | `3dd164b959a5…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `unit-economics-tables` | 375 px | light | `3b2535da9613…` | `303103d13b3e…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |


## Fazit

- Gerenderte Bildpaare: 18/18 (Vollständig).
- Visuelle Differenz: 18/18 Bildpaare mit beabsichtigter Änderung (100% geändert).
- Überlauf über alle Viewports und Themes: **exakt 0 px** (kein horizontaler Überlauf).
- Gate-Gesamtergebnis: **PASS**.
