# Auftrag 067O / Gate G61 — Screenshot- & A11y-Matrix (Datenquellen-, Frische- und Degraded-Anzeigen)

Dieser Bericht dokumentiert den visuellen, A11y- und Barrierefreiheitsstatus für die in Auftrag 067O (Gate G61) umgesetzten Anzeigen für Datenquelle, Modus, Datenalter, Frische und Gesundheitsstatus:

1. **Vollständige Provenienz & Frische auf allen 4 Kernansichten:**
   - `/dashboard` (Executive Cockpit: Header-Badges und Live-Provenienz-Banner der LeadPilot Baseline)
   - `/company/data-basis` (Datenbasis: Detaillierte Provenienz- und Frischeanzeige mit Fail-Closed Alert im Ausfall)
   - `/crm/leads` (CRM Leads & Kontakte: Globale Kopfleiste für serverseitige Supabase CRM-Quellenwahrheit)
   - `/crm/live-simulation` (Live-Simulation: Provenienz- und Frische-Badges im Header der Simulations-Engine)

2. **Visuelle Trennung & Barrierefreiheit (WCAG 2.1 AA):**
   - Status- und Frischeinformationen werden **niemals nur über Farbe** transportiert (semantische Lucide-Icons + eindeutiger Text).
   - `degraded` und `unavailable` heben sich optisch unmissverständlich von Live-Zuständen ab (`role="alert"` in Banner-Ansicht).
   - `fresh` ($\le$ 15 min), `stale` (15 min bis 24 h) und `expired` (> 24 h) sind eindeutig unterscheidbar.
    - Alle 18 Playwright-Axe-A11y-Läufe (`e2e/a11y.spec.ts`) über alle 6 Routen und alle 3 Viewports sind 100% grün (0 critical/serious Verstöße).

3. **Responsive Prüfung & Overflow:**
   - Exakt 0 px horizontaler Overflow über alle drei Referenz-Viewports (Desktop 1440×900, Tablet 768×1024, Mobile 375×812).

---

## Screenshot- & Overflow-Matrix (Harness-Ausführung)

Gemessen mit Chromium über Vite Preview (Port 4321), authentifiziert mit lokalem Seed-Admin (`admin-a@e2e.local`):

| Route | Viewport | Datei | SHA-256 Hash | Horizontal Overflow | Befund |
|---|---|---|---|---|---|
| `/dashboard` | 1440px (1440×900) | `dashboard-1440.png` | `f8e60a4b4c8814e2fe11dc09520bebbf1d8487df483a19687dd95f85b8016c02` | 0px | 0px Overflow, WCAG AA konform |
| `/dashboard` | 768px (768×1024) | `dashboard-768.png` | `acd051f36cceff303bb387ae04412e9eb7c160d4573fe0cdc941eba5e596d403` | 0px | 0px Overflow, WCAG AA konform |
| `/dashboard` | 375px (375×812) | `dashboard-375.png` | `5b9d0f1aec10b5e5fd82aa01dd0f3772d3726c3b4c73f2fcc31fe70861635c30` | 0px | 0px Overflow, WCAG AA konform |
| `/company/data-basis` | 1440px (1440×900) | `company-data-basis-1440.png` | `6e6a0a0e546a8471b627c993e499af4a427338b5b1358c988d0fbee73946f089` | 0px | 0px Overflow, WCAG AA konform |
| `/company/data-basis` | 768px (768×1024) | `company-data-basis-768.png` | `885f930be4e874a5f7e185ab189429f4385ae3d66e74b7bf921e06669ed8e218` | 0px | 0px Overflow, WCAG AA konform |
| `/company/data-basis` | 375px (375×812) | `company-data-basis-375.png` | `9205a6e43307d77dceca7651b457da268d899eba6788de7f4d39a85d01a4999e` | 0px | 0px Overflow, WCAG AA konform |
| `/crm/leads` | 1440px (1440×900) | `crm-leads-1440.png` | `f4c686ed6845a4422449240ed539b74dbbc3552f8541cc00f2c61d0f2c026212` | 0px | 0px Overflow, WCAG AA konform |
| `/crm/leads` | 768px (768×1024) | `crm-leads-768.png` | `1a30382bdc17ed29fb8e296eea309d8235e1d226cc7e9cbf783776c355ab92a2` | 0px | 0px Overflow, WCAG AA konform |
| `/crm/leads` | 375px (375×812) | `crm-leads-375.png` | `8587b28d7acb45afaff96de2713474a89147674a5e2692a419e8d94f829a416f` | 0px | 0px Overflow, WCAG AA konform |
| `/crm/live-simulation` | 1440px (1440×900) | `crm-live-simulation-1440.png` | `adecae322ccc5926d780885d84c9a9eb154c4b7de7795ec9046032fbaa665809` | 0px | 0px Overflow, WCAG AA konform |
| `/crm/live-simulation` | 768px (768×1024) | `crm-live-simulation-768.png` | `1a2c781b869be856084d6921c67e2ba448d5a7d8cd492e2b8e9882344e17288d` | 0px | 0px Overflow, WCAG AA konform |
| `/crm/live-simulation` | 375px (375×812) | `crm-live-simulation-375.png` | `279100cbabd816ff27cf70fc1301592c714265741681b61ded1e37e36778bcb7` | 0px | 0px Overflow, WCAG AA konform |

---

## Verifikationsergebnis

- **Axe-Accessibility E2E:** 18/18 Playwright-Durchläufe in `e2e/a11y.spec.ts` erfolgreich bestanden (Exit 0).
- **Unit- & Komponententests:** 255 Testdateien, 1370 Tests bestanden (Exit 0).
- **TypeScript-Compiler:** `npx tsc --noEmit` mit 0 Fehlern (Exit 0).
- **ESLint & Prettier:** `npm run lint` mit 0 Warnungen, `npm run format:check` vollständig grün.
- **Integritätssuiten:** 25/25 Suiten in `npm run verify` bestanden (Exit 0).
- **Deno Edge Functions:** 59/59 Tests bestanden (Exit 0).
- **pgTAP DB-Tests:** 122/122 Tests bestanden (Exit 0).
- **Schutzbereich-Prüfung:** `git diff 3d44ef8 -- src/simulation src/types src/context src/features/resources src/services/db/crmRepository.ts src/auth src/features/auth` liefert exakt 0 Zeilen Diff.
