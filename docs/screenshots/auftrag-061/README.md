# Auftrag 061 — Screenshot-Vergleich & Visual-Regression-Matrix (Gate G43)

Dieser Bericht dokumentiert den visuellen Regressions-Status für das V2.2.0 Release-Audit. Gemäß G31 (`docs/TEST_MIGRATION_V2_2_0.md`) und Auftrag 046 wurden die früheren handgebauten Capture-Harnesses durch Playwright Visual Regression (`e2e/visual.spec.ts`) mit strikter Pixelgenauigkeit (`maxDiffPixelRatio: 0`) abgelöst.

## Übersicht der 15 Kern-Routen-Snapshots (Darwin Baseline vs. V2.2.0 Audit-Stand)

Alle 15 Screens werden in CI und lokal über Playwright mit `maxDiffPixelRatio: 0` (0 Pixel Toleranz) gegen die committeten Referenz-Snapshots (`e2e/visual.spec.ts-snapshots/`) validiert.

| Route & Ansicht | Viewport | Referenz SHA-256 (Auszug) | Ist-Zustand (Audit G43) | Differenz | Befund |
|---|---|---|---|---|---|
| `/dashboard` | Desktop (1440 × 900) | `bb3712558c607c02...` | 100% Identisch | 0 Pixel (Ratio 0.00) | ✅ Bitgenau deckungsgleich |
| `/dashboard` | Tablet (768 × 1024) | `68a4a9ba9312701a...` | 100% Identisch | 0 Pixel (Ratio 0.00) | ✅ Bitgenau deckungsgleich |
| `/dashboard` | Mobile (375 × 812) | `f16e1581f93f16d8...` | 100% Identisch | 0 Pixel (Ratio 0.00) | ✅ Bitgenau deckungsgleich |
| `/crm/leads` | Desktop (1440 × 900) | `ac7d39268e8a99a8...` | 100% Identisch | 0 Pixel (Ratio 0.00) | ✅ Bitgenau deckungsgleich |
| `/crm/leads` | Tablet (768 × 1024) | `c694c21febd1d404...` | 100% Identisch | 0 Pixel (Ratio 0.00) | ✅ Bitgenau deckungsgleich |
| `/crm/leads` | Mobile (375 × 812) | `be91555a3ced0708...` | 100% Identisch | 0 Pixel (Ratio 0.00) | ✅ Bitgenau deckungsgleich |
| `/finance/p-and-l` | Desktop (1440 × 900) | `a31743a4a8f7bcbb...` | 100% Identisch | 0 Pixel (Ratio 0.00) | ✅ Bitgenau deckungsgleich |
| `/finance/p-and-l` | Tablet (768 × 1024) | `27ee83e791bb222d...` | 100% Identisch | 0 Pixel (Ratio 0.00) | ✅ Bitgenau deckungsgleich |
| `/finance/p-and-l` | Mobile (375 × 812) | `9c84791dd9a50a55...` | 100% Identisch | 0 Pixel (Ratio 0.00) | ✅ Bitgenau deckungsgleich |
| `/market/overview` | Desktop (1440 × 900) | `cf624905620f805c...` | 100% Identisch | 0 Pixel (Ratio 0.00) | ✅ Bitgenau deckungsgleich |
| `/market/overview` | Tablet (768 × 1024) | `3f66ed01ee559f52...` | 100% Identisch | 0 Pixel (Ratio 0.00) | ✅ Bitgenau deckungsgleich |
| `/market/overview` | Mobile (375 × 812) | `19bda789dd48824b...` | 100% Identisch | 0 Pixel (Ratio 0.00) | ✅ Bitgenau deckungsgleich |
| `/resources/materials` | Desktop (1440 × 900) | `441f920a29e2a660...` | 100% Identisch | 0 Pixel (Ratio 0.00) | ✅ Bitgenau deckungsgleich |
| `/resources/materials` | Tablet (768 × 1024) | `98ac79d346c8e01e...` | 100% Identisch | 0 Pixel (Ratio 0.00) | ✅ Bitgenau deckungsgleich |
| `/resources/materials` | Mobile (375 × 812) | `6ccad904dd940dc8...` | 100% Identisch | 0 Pixel (Ratio 0.00) | ✅ Bitgenau deckungsgleich |

## Ergänzende Nachweise aus Auftrag 060 (`/login`)

| Ansicht | Datei | Viewport | SHA-256 (Auszug) | Befund |
|---|---|---|---|---|
| Login-Seite | `docs/screenshots/auftrag-060/login-1440.png` | Desktop 1440px | `a0010cf5bd30027f...` | Zentrierte Brand-Card, sichtbarer Demo-Hinweis |
| Login-Seite | `docs/screenshots/auftrag-060/login-768.png` | Tablet 768px | `566cbbf6b17d0dbf...` | Responsiv zentriert |
| Login-Seite | `docs/screenshots/auftrag-060/login-375.png` | Mobile 375px | `1d4d57102c4a5c1e...` | Single-Column-Layout, kein Overflow |

## Zusammenfassung

1. **Visuelle Stabilität:** Sämtliche 15 Core-Screens bestehen den Playwright-Test mit exakt 0 Pixel Abweichung gegenüber den Baselines.
2. **Keine Layout-Shifts:** Weder durch die Prettier-Formatierung (Block B) noch durch die Auth-Schicht (Gate G42) traten visuelle Veränderungen auf den geschützten Kernrouten auf.
3. **Ergebnis:** Visual Regression 15/15 bestanden (`15 passed`).
