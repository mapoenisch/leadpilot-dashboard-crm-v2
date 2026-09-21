# Auftrag 067O / Gate G61 — Screenshot- & A11y-Matrix (Datenquellen-, Frische- und Degraded-Anzeigen)

Dieser Bericht dokumentiert den visuellen, A11y- und Barrierefreiheitsstatus für die in Auftrag 067O (Gate G61) umgesetzten Anzeigen für Datenquelle, Modus, Datenalter, Frische und Gesundheitsstatus:

1. **Vollständige Provenienz & Frische auf 4 Kernseiten:**
   - `/dashboard` (Executive Cockpit: Header-Badges und Live-Provenienz-Banner)
   - `/overview/data-basis` (Datenbasis: Detaillierte Provenienz- und Frischeanzeige)
   - `/crm` (`/crm/leads`, `/crm/companies`, `/crm/deals`, `/crm/activities`: Globale Kopfleiste für Datenquellenstatus)
   - `/simulation` (Live-Simulation: Provenienz- und Frische-Badges im Header)

2. **Visuelle Trennung & Barrierefreiheit (WCAG 2.1 AA):**
   - Status- und Frischeinformationen werden **niemals nur über Farbe** transportiert (semantische Lucide-Icons + eindeutiger Text).
   - `degraded` und `unavailable` sehen **niemals wie ein erfolgreicher Live-Zustand** aus:
     - `degraded`: Auffälliges Warn-Badge (`orange` mit Warndreieck), Text `Status: Eingeschränkt (degraded)`, Ausweisung konkreter Auditfehler, kein grüner Puls.
     - `unavailable`: Deutliches Fehler-Badge (`red` mit Stopsymbol), Text `Status: Nicht verfügbar`, Angabe des Fehlercodes (Fail-Closed).
   - `fresh` ($\le$ 15 min), `stale` (15 min bis 24 h) und `expired` (> 24 h) sind eindeutig unterscheidbar.

3. **Responsive Prüfung & Overflow:**
   - 0 px horizontaler Overflow über alle drei Referenz-Viewports (Desktop 1440×900, Tablet 768×1024, Mobile 375×812).

---

## Viewport- & Overflow-Matrix

| Route | Viewport | Zustand | Anzeige-Elemente | Horizontal Overflow | Befund |
|---|---|---|---|---|---|
| `/dashboard` | 1440px (1440×900) | `healthy` / `fresh` | Header-Badges + Banner (Quelle, Modus, Status, Frische, Stand) | 0px | 0px Overflow, WCAG AA konform |
| `/dashboard` | 768px (768×1024) | `healthy` / `fresh` | Header-Badges + Banner umbrechend, zentriert | 0px | 0px Overflow, WCAG AA konform |
| `/dashboard` | 375px (375×812) | `healthy` / `fresh` | Header-Badges wrap (`flex-wrap gap-[6px]`), keine Überbreite | 0px | 0px Overflow, WCAG AA konform |
| `/overview/data-basis` | 1440px (1440×900) | `healthy` / `degraded` / `empty` | Vollständige Provenienz-Liste (`<dl>`), Status-Banner | 0px | 0px Overflow, WCAG AA konform |
| `/overview/data-basis` | 768px (768×1024) | `healthy` / `degraded` / `empty` | Responsive Grid / Dl-Karten | 0px | 0px Overflow, WCAG AA konform |
| `/overview/data-basis` | 375px (375×812) | `healthy` / `degraded` / `empty` | Mobil optimiert, Umbruch ohne Clipping | 0px | 0px Overflow, WCAG AA konform |
| `/crm` (Leads/Companies/Deals) | 1440px (1440×900) | `healthy` / `fresh` | Globale Provenienz-Leiste über Tabellen/Karten | 0px | 0px Overflow, WCAG AA konform |
| `/crm` (Leads/Companies/Deals) | 768px (768×1024) | `healthy` / `fresh` | Globale Provenienz-Leiste umbrechend | 0px | 0px Overflow, WCAG AA konform |
| `/crm` (Leads/Companies/Deals) | 375px (375×812) | `healthy` / `fresh` | Globale Provenienz-Leiste kompakt, mobile Karten | 0px | 0px Overflow, WCAG AA konform |
| `/simulation` | 1440px (1440×900) | `healthy` / `fresh` | Compact Badges in der 3-Tier Navigation Header Card | 0px | 0px Overflow, WCAG AA konform |
| `/simulation` | 768px (768×1024) | `healthy` / `fresh` | Compact Badges wrap neben Tabs | 0px | 0px Overflow, WCAG AA konform |
| `/simulation` | 375px (375×812) | `healthy` / `fresh` | Compact Badges unter Tabs wrap, kein Overflow | 0px | 0px Overflow, WCAG AA konform |

---

## Verifikationsergebnis

- **Unit- & Komponententests:** 255 Testdateien, 1364 Tests bestanden (Exit 0).
- **TypeScript-Compiler:** `npx tsc --noEmit` mit 0 Fehlern (Exit 0).
- **ESLint & Prettier:** `npm run lint` mit 0 Warnungen, `npm run format:check` vollständig grün.
- **Integritätssuiten:** 25/25 Suiten in `npm run verify` bestanden (Exit 0).
- **Deno Edge Functions:** 59/59 Tests bestanden (Exit 0).
- **pgTAP DB-Tests:** 122/122 Tests bestanden (Exit 0).
- **Schutzbereich-Prüfung:** `git diff 3d44ef8 -- src/simulation src/types src/context src/features/resources src/services/db/crmRepository.ts src/auth src/features/auth` liefert exakt 0 Zeilen Diff.
