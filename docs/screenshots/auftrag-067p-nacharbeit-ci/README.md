# Auftrag 067P-N — Nachweis-Matrix CI-Nacharbeit (nur Text, keine Bilddateien)

**Baseline:** `d984068` · **Branch:** `feat/auftrag-067p-audit-diagnostics` · **Datum:** 2026-09-22
**Node:** v22.18.0 (CI-Version; lokal via nodejs.org-Tarball, `node --version` belegt)

Regen-Umgebung für die Linux-Baselines (CI-nah, kein Mac-Ersatz):
Ubuntu 24.04 (`linux/amd64`, wie `ubuntu-latest`), Node v22.18.0,
Chromium Headless Shell 1243 (`npx playwright install --with-deps chromium`,
gleicher Cache-Key wie CI), App-Build gegen lokales Supabase mit
`supabase/seed.sql`-Seed (5 E2E-User, Org A/B).
Befehl: `npx playwright test e2e/visual.spec.ts -g 'visual /(dashboard|crm/leads)' --update-snapshots`
Re-Run ohne `--update-snapshots`: **15/15 grün** (alle 5 Routen × 3 Viewports).

## Snapshot-Matrix (sichtgeprüft: Expected = neue Linux-Baseline)

| Route | Viewport | Linux-Snapshot | Sichtgeprüfter Inhalt | Horizontaler Overflow | Ergebnis |
|---|---|---|---|---|---|
| `/dashboard` | 1440 | `visual-dashboard-1-desktop-1440-linux.png` | G61-Freshness: `SNAPSHOT: STAND 31.12.2025` + `Stand: 31.12.2025, 23:59:59`, `STATUS: GESUND`; keine Fehlerseite, kein Clipping, keine unmotivierte Layoutänderung | 0 px | ✅ |
| `/dashboard` | 768 | `visual-dashboard-1-tablet-768-linux.png` | Gleiche Freshness-Chips wie Desktop, Tablet-Layout intakt; keine Fehlerseite, kein Clipping | 0 px | ✅ |
| `/dashboard` | 375 | `visual-dashboard-1-mobile-375-linux.png` | Freshness-Chips brechen sauber um (`EBENE A BASELINE` / `STAND: 31.12.2025` / `EBENE C REALTIME` je eigene Zeile); keine Fehlerseite, kein Clipping | 0 px | ✅ |
| `/crm/leads` | 1440 | `visual-crm-leads-1-desktop-1440-linux.png` | G60-Provenance: `EBENE A CRM`, `SUPABASE CRM`, `FRISCHE: AKTUELL (GERADE EBEN)`, `Stand: 22.09.2026, …`, `1 EINTRÄGE`, Tabelle mit Seed-Kontakt; keine Fehlerseite, kein Clipping | 0 px | ✅ |
| `/crm/leads` | 768 | `visual-crm-leads-1-tablet-768-linux.png` | Gleiche Provenance-Chips, Karten- und Tab-Layout intakt; keine Fehlerseite, kein Clipping | 0 px | ✅ |
| `/crm/leads` | 375 | `visual-crm-leads-1-mobile-375-linux.png` | Provenance-Chips umbrechen (`FRISCHE: AKTUELL (GERADE EBEN)` eigene Zeile), Karten einspaltig; keine Fehlerseite, kein Clipping | 0 px | ✅ |

Hinweise (für den Prüfer):

- Darwin-Snapshots, `/resources/materials` und die übrigen drei Visual-Routen
  (`/finance/p-and-l`, `/market/overview`) sind unverändert — `git status`
  zeigt ausschließlich die 6 obigen `*-linux.png`.
- CRM-`Stand`-Zeitstempel = Client-`dataUpdatedAt` des letzten Query-Fetch
  (`useCrmProvenance.ts`), also Laufzeit-Wall-Clock (Desktop `:34` vs. Mobile
  `:44` im selben Lauf). Re-Run Minuten später trotzdem 15/15 grün:
  Ziffern-Drift bleibt weit unter `maxDiffPixelRatio 0.001`. Dashboard-`Stand`
  (`31.12.2025, 23:59:59`) ist statisches Seed-Datum, voll deterministisch.
- Issue #13 (`/resources/materials`, 375 px): Clipping-Test grün ohne
  Produktänderung — `InternalResourcesView.tsx` unverändert (siehe BUILD_LOG).
- Stopp-Punkt (kein Blocker dieser Matrix): `e2e/element-clipping.acceptance.ts`
  passt nicht zum Default-`testMatch` (`*.spec.ts`/`*.test.ts`) und wird daher
  weder per `npx playwright test e2e/element-clipping.acceptance.ts
  --project=mobile-375` gefunden („No tests found") noch — in der CI-Liste
  mitgeführt — ausgeführt (stilles Skip, belegt). Für die Abnahme fehlt eine
  Zeile `testMatch` in `playwright.config.ts` (außerhalb der 067P-N-Dateiliste;
  exakter Vorschlag im BUILD_LOG-Eintrag).
