# Auftrag 132: Screenshot-Gate-Nachweis

**Route:** `/dashboard`  
**Baseline:** `ce21c15` (origin/main Build in `/tmp/leadpilot-baseline-132/dist`) auf Port 3001  
**Nachher:** `claude/auftrag-132-dashboard-report-export` (Head Build) auf Port 3000  
**Datum:** 2026-11-07  
**Ergebnis:** 18/18 Bildpaare mit beabsichtigter Änderung, maximaler Überlauf: **0 px**.  
**Status:** **PASS**

## Screenshot-Vergleichsmatrix

| Szenario | Breite | Theme | Vorher SHA-256 (ce21c15) | Nachher SHA-256 (Head) | Diff? | Überlauf Vorher | Überlauf Nachher | Status |
|---|---|---|---|---|---|---|---|---|
| `dashboard-standard` | 1440 px | dark | `f1f3e3027701…` | `87c24c274342…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `dashboard-standard` | 768 px | dark | `c189f80a00ca…` | `047085cfba0d…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `dashboard-standard` | 375 px | dark | `ec8a2ff43b91…` | `1ed2ded0576e…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `dashboard-standard` | 1440 px | light | `1ed4811dca95…` | `ef3c9ee7c49e…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `dashboard-standard` | 768 px | light | `439e48433d3e…` | `8f52084c3202…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `dashboard-standard` | 375 px | light | `567a924ba08f…` | `e0753d3c436b…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `dashboard-report-modal` | 1440 px | dark | `f1f3e3027701…` | `aada5e7ac43b…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `dashboard-report-modal` | 768 px | dark | `c189f80a00ca…` | `e76f87022826…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `dashboard-report-modal` | 375 px | dark | `ec8a2ff43b91…` | `cf9622eb0d5f…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `dashboard-report-modal` | 1440 px | light | `1ed4811dca95…` | `dfeff42168ef…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `dashboard-report-modal` | 768 px | light | `439e48433d3e…` | `b7ff446db749…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `dashboard-report-modal` | 375 px | light | `567a924ba08f…` | `86f8f244efb6…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `dashboard-print-view` | 1440 px | dark | `80c4fee723a9…` | `560b45c459cc…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `dashboard-print-view` | 768 px | dark | `f08635199ab6…` | `5533e2cb9d8c…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `dashboard-print-view` | 375 px | dark | `a140f6c60c1c…` | `ec2982043f31…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `dashboard-print-view` | 1440 px | light | `1ed4811dca95…` | `03929fdec467…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `dashboard-print-view` | 768 px | light | `439e48433d3e…` | `9825fc651585…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |
| `dashboard-print-view` | 375 px | light | `567a924ba08f…` | `11ddc9bcb3a3…` | ✅ geändert | 0 px | 0 px | 🟢 Pass (0 px) |


## Fazit

- Gerenderte Bildpaare: 18/18 (Vollständig).
- Visuelle Differenz: 18/18 Bildpaare mit beabsichtigter Änderung (100% geändert).
- Überlauf über alle Viewports und Themes: **exakt 0 px** (kein horizontaler Überlauf).
- Gate-Gesamtergebnis: **PASS**.
