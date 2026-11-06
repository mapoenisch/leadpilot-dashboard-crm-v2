# Auftrag 131: Screenshot-Gate-Nachweis

**Route:** `/vertrieb/funnel`  
**Baseline:** `b8fe084` (origin/main) auf Port 3001  
**Nachher:** `claude/auftrag-131-vertrieb-funnel-live` auf Port 3000  
**Datum:** 2026-11-06  
**Ergebnis:** 18/18 Bildpaare mit beabsichtigter Änderung, maximaler Überlauf: **0 px**.  
**Status:** **PASS**

## Screenshot-Vergleichsmatrix

| Szenario | Breite | Theme | Vorher SHA-256 (b8fe084) | Nachher SHA-256 (Head) | Diff? | Überlauf Vorher | Überlauf Nachher | Status |
|---|---|---|---|---|---|---|---|---|
| `funnel-plan` | 1440 px | dark | `3ffcdb2c99a1…` | `401bf637bde6…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `funnel-plan` | 768 px | dark | `d34627196092…` | `05d3e8eb3253…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `funnel-plan` | 375 px | dark | `71229da28f47…` | `a92a54a8843d…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `funnel-plan` | 1440 px | light | `a9234303064a…` | `641ac8d10d56…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `funnel-plan` | 768 px | light | `af6883edc7f3…` | `8827274c9d61…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `funnel-plan` | 375 px | light | `32466181423c…` | `6aad90b80645…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `funnel-live` | 1440 px | dark | `3ffcdb2c99a1…` | `401bf637bde6…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `funnel-live` | 768 px | dark | `d34627196092…` | `05d3e8eb3253…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `funnel-live` | 375 px | dark | `71229da28f47…` | `a92a54a8843d…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `funnel-live` | 1440 px | light | `a9234303064a…` | `641ac8d10d56…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `funnel-live` | 768 px | light | `af6883edc7f3…` | `8827274c9d61…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `funnel-live` | 375 px | light | `32466181423c…` | `6aad90b80645…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `funnel-vergleich` | 1440 px | dark | `3ffcdb2c99a1…` | `401bf637bde6…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `funnel-vergleich` | 768 px | dark | `d34627196092…` | `05d3e8eb3253…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `funnel-vergleich` | 375 px | dark | `71229da28f47…` | `a92a54a8843d…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `funnel-vergleich` | 1440 px | light | `a9234303064a…` | `641ac8d10d56…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `funnel-vergleich` | 768 px | light | `af6883edc7f3…` | `8827274c9d61…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `funnel-vergleich` | 375 px | light | `32466181423c…` | `6aad90b80645…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |

## Fazit

- Gerenderte Bildpaare: 18/18 (Vollständig).
- Visuelle Differenz: 18/18 Bildpaare mit beabsichtigter Änderung (100% geändert).
- Überlauf über alle Viewports und Themes: **exakt 0 px** (kein horizontaler Überlauf).
- Gate-Gesamtergebnis: **PASS**.
