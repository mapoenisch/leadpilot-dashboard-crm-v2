# Auftrag 028: V2-App-Schale und Design-Primitives Implementation Plan

> **Für ausführende Agenten:** Diesen Auftrag seriell und taskweise abarbeiten. Nach jedem Task müssen die dort genannten Nachweise erbracht sein. Änderungen außerhalb der Ziel-Dateien sind nicht zulässig, außer sie wurden vorab als Abweichung im Build-Log begründet und freigegeben.

**Phase:** UI-Umbau · **Gate:** G12

**Status:** DRAFT / SPEZIFIKATION

**Goal:** Die bestehende App-Schale wird als V2-Layout konsolidiert und `Card` wird direkt zur gemeinsamen `GlassCard` erweitert (keine parallele zweite Kartenfamilie). Die Kern-Primitives (`Button`, `Badge`, `StatusChip`, `Alert`) werden tokenbasiert auditiert und harmonisiert. Alle neuen Motion-Hooks respektieren `prefers-reduced-motion`. Keine Migration bestehender Fach-Views, keine Simulationsänderungen und keine shadcn-Ablösung ohne konkreten Bedarf.

**Architecture:** V2-App-Shell (`Layout`, `Header`, `Sidebar`, `SimulationBar`) mit konsistenten Glassmorphism- und Token-Regeln. `Card` fungiert als Single Source of Truth für Karten-Layouts mit Glas-Fläche (`backdrop-filter: blur`, transparente Surface-Tokens, dezentem 1px Border und Tokenschatten). Die Kern-Primitives bleiben rückwärtskompatibel zu allen bestehenden Aufrufern und unterstützen konsistente States (Hover, Focus, Disabled, Loading).

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS 3 (ohne Preflight), bestehende CSS-Variablen (`src/styles/global.css`), Framer Motion / Motion-Hooks mit `prefers-reduced-motion`, Chrome CDP-Screenshot-Harness.

**Referenzen:** `CLAUDE.md`; `AGENTS.md`; `docs/BUILD_PLAN_V2.0.0.md` Phase 2 (Gate G12); `ARCHITECTURE_DECISIONS.md`; `docs/auftraege/ANTIGRAVITY_AUFTRAG_027_UI_INFRASTRUKTUR_ROUTING.md`.

---

## Globale Grenzen & Schutzbereiche

- **Baseline-Commit**: `210fd9a` (Freigabe Gate G11) auf Branch `feat/auftrag-028-design-primitives`.
- **Schutzbereichs-Diff (Zero-Diff)**: Exakt 0 Zeilen Unterschied gegen `210fd9a` in:
  - `src/simulation/**`
  - `src/types/**`
  - `src/context/**`
  - `src/services/data/**`
  - `src/features/resources/**`
- **Keine zweite Kartenfamilie**: Es wird **keine** separate `GlassCard.tsx` angelegt. Stattdessen wird die vorhandene `src/components/ui/Card.tsx` rückwärtskompatibel erweitert (neue Varianten/Props wie `variant?: 'default' | 'glass' | 'elevated' | 'warning' | 'info'`). Bestehende Verwendungen von `<Card>` und `<Card featured>` bleiben optisch und funktional 100% stabil.
- **Keine Migration von Feature-Views**: Bestehende Fachseiten (CRM, Finanzen, Markt, etc.) werden in diesem Auftrag **nicht** angefasst.
- **Sichtbarer Nachweis & Kein künstlicher Dauer-Spinner**:
  - `NotFoundPage.tsx` nutzt `<Card variant="glass">` als sauberen Nachweis ohne fehlerhafte Schein-Aktionen.
  - Der `Button`-Loading-State wird isoliert im Test-Harness (bzw. über einen echten temporären asynchronen Klick-Zustand wie einen Re-Trigger-Check) nachgewiesen, nicht als dauerhafter Schein-State auf einer Produkt- oder 404-Seite.
- **Kein pauschaler shadcn-Austausch**: Die bestehenden LeadPilot-Primitives (`Button`, `Badge`, `Modal`, `Select`, etc.) werden **nicht** durch shadcn-Primitives ersetzt, solange kein funktionaler Mangel vorliegt. shadcn-Primitives in `src/components/shadcn/` bleiben Hilfsbausteine.
- **Barrierefreiheit (A11y)**: Focus-Visible, `aria-hidden` und `inert` im mobilen Drawer bleiben erhalten. Farbkontraste erfüllen WCAG AA.
- **Sidebar-Kategorie-Semantik & ID-Targeting**:
  - Klickbare `div`s der Navigationskategorien in `Sidebar.tsx` werden zu echten semantischen `<button type="button">` mit `aria-expanded={isOpen}` und `aria-controls={`nav-category-items-${cat.id}`}`.
  - Der aufklappbare Container der Kategorie-Einträge erhält zwingend die exakt passende ID `id={`nav-category-items-${cat.id}`}`.
- **Motion**: Alle Animationen prüfen `prefers-reduced-motion`. In diesem Auftrag werden noch keine fachlichen Zähl- oder Diagrammanimationen eingebaut.

---

## Ziel-Dateien

| Datei | Verantwortung |
|---|---|
| `src/components/ui/Card.tsx` | Konsolidierte Karte mit Glassmorphism-Unterstützung (`glass`, `featured`, `warning`, `info`), dezentem Blur und Token-Border |
| `src/styles/global.css` | Glassmorphism-Tokens (`--glass-surface`, `--glass-border`), Reduzierte-Bewegung-Regeln (`prefers-reduced-motion`) |
| `src/components/layout/Layout.tsx` | V2-Schale: Konsolidierter Hauptbereich mit dezenter Hintergrund-Tiefe, geschützter Drawer-Isolation (`aria-hidden`/`inert`) |
| `src/components/layout/Header.tsx` | V2-Topbar: Token-Spiegelung, dezenter Glassmorphism, klares User-/Breadcrumb-Layout |
| `src/components/layout/Sidebar.tsx` | V2-Sidebar: Semantische Category-Buttons (`aria-expanded`, `aria-controls`), passender Container mit `id={`nav-category-items-${cat.id}`}`, subtiler Glass-Hintergrund |
| `src/components/layout/SimulationBar.tsx` | V2-Simulation-Command-Strip: V2-Karten/Chip-Harmonisierung, klare Button-Zustände |
| `src/components/ui/Button.tsx` | Harmonisierte States: Hover, Active, Focus-Visible, Disabled, Loading (Spinner-Prop `loading`) |
| `src/components/ui/Badge.tsx` | Semantische Varianten mit konsistenten Border-/Bg-Tokens |
| `src/components/ui/StatusChip.tsx` | Harmonisierte Indikator-Chips mit reduzierter Pulse-Motion |
| `src/components/ui/Alert.tsx` | Harmonisierte Informations-, Warn- und Fehler-Banner |
| `src/app/NotFoundPage.tsx` | Sichtbarer Nachweis: Verwendet `Card variant="glass"` sauber gestaltet mit Rücksprung-Link |
| `src/hooks/useReducedMotion.ts` | Wiederverwendbarer Hook für `prefers-reduced-motion` |
| `scripts/captureAuftrag028GateScreenshots.mjs` | Neuer Standalone Chrome CDP-Harness für Gate G12 Vorher/Nachher-Prüfung, Loading-Button-Test & `prefers-reduced-motion`-Assertion |
| `docs/screenshots/auftrag-028/README.md` | Screenshot-Verifikationsmatrix (18 Vorher + 18 Nachher = 36 PNGs, Hashes, Overflows) |
| `docs/BUILD_LOG.md` | Protokolleintrag für Gate G12 |

---

## Task 1: Baseline-Sicherung und Branch-Setup

**Files:**
- Test: `git status`, `npx tsc --noEmit`, `npm run verify`, `npm run build`

- [x] **Schritt 1: Baseline auf 210fd9a absichern**
  Prüfe, dass der Arbeitsbaum sauber ist und `git log -1` auf Commit `210fd9a` zeigt. Erstelle den Branch `feat/auftrag-028-design-primitives` (bzw. checkout, falls noch nicht aktiv).
- [x] **Schritt 2: Baseline-Verifikation ausführen**
  ```bash
  npx tsc --noEmit
  npm run verify
  npm run build
  ```
  Alle drei Befehle müssen Exit-Code 0 liefern.

---

## Task 2: Tokens, Motion-Hook und GlassCard-Erweiterung

**Files:**
- Create: `src/hooks/useReducedMotion.ts`
- Modify: `src/styles/global.css`, `src/components/ui/Card.tsx`, `src/app/NotFoundPage.tsx`
- Test: `npx tsc --noEmit`, `npm run build`

- [x] **Schritt 1: Glass-Tokens und prefers-reduced-motion in global.css**
  Ergänze in `:root`:
  - `--color-surface-glass: rgba(18, 51, 48, 0.65);`
  - `--color-surface-glass-raised: rgba(26, 63, 56, 0.75);`
  - `--color-border-glass: rgba(42, 74, 67, 0.6);`
  - `--backdrop-blur: blur(12px);`
  Ergänze `@media (prefers-reduced-motion: reduce)`-Regeln, die Puls-Animationen und Übergänge sanft dämpfen oder stoppen.
- [x] **Schritt 2: useReducedMotion Hook anlegen**
  Implementiere `src/hooks/useReducedMotion.ts`, der `window.matchMedia('(prefers-reduced-motion: reduce)')` sauber abfragt und auf Änderungen reagiert.
- [x] **Schritt 3: Card.tsx direkt als GlassCard erweitern**
  Erweitere `CardProps`:
  ```ts
  export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    featured?: boolean;
    variant?: 'default' | 'glass' | 'elevated' | 'warning' | 'info';
    padding?: string;
    children: React.ReactNode;
  }
  ```
  - Standard (`default`): Rückwärtskompatibel mit `var(--color-surface)`.
  - `glass`: Nutzt `var(--color-surface-glass)`, `backdropFilter: var(--backdrop-blur)` und `var(--color-border-glass)`.
  - `featured`: Behält den Cyan-Glow `var(--shadow-glow-cyan)` und Rand.
  - `warning` / `info`: Subtile semantische Rand- und Hintergrund-Akzente.
  - Alle bisherigen Aufrufe `<Card>` und `<Card featured>` bleiben exakt unverändert kompatibel.
- [x] **Schritt 4: Sichtbarer GlassCard-Nachweis in NotFoundPage.tsx**
  `NotFoundPage.tsx` verwendet `<Card variant="glass">` und bindet einen sauberen Rücksprung-Link ein (ohne falschen Dauer-Spinner).

---

## Task 3: Harmonisierung der Kern-Primitives (Button, Badge, StatusChip, Alert)

**Files:**
- Modify: `src/components/ui/Button.tsx`, `src/components/ui/Badge.tsx`, `src/components/ui/StatusChip.tsx`, `src/components/ui/Alert.tsx`
- Test: `npx tsc --noEmit`, `npm run verify`

- [x] **Schritt 1: Button.tsx harmonisieren**
  Ergänze `loading?: boolean` mit dezentem barrierefreien SVG-Spinner (`aria-busy="true"`, `aria-live="polite"`).
  Stelle sicher, dass `:focus-visible`, `disabled` (mit `opacity: 0.5`, `pointer-events: none`) und Hover-Effekte auf Tokens basieren.
- [x] **Schritt 2: Badge.tsx & StatusChip.tsx harmonisieren**
  Puls-Animationen in `StatusChip` respektieren `useReducedMotion()`.
  Farbvarianten greifen nahtlos auf die LeadPilot-Semantik zu (`cyan`, `orange`, `mint`, `neutral`).
- [x] **Schritt 3: Alert.tsx harmonisieren**
  Kombiniere dezente Token-Hintergründe (`rgba(...)`), abgerundete Ecken (`var(--radius-md)`) und klare semantische Ikonografie/Titel.

---

## Task 4: Konsolidierung der V2-App-Schale & Sidebar-Barrierefreiheit

**Files:**
- Modify: `src/components/layout/Layout.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/SimulationBar.tsx`
- Test: `npx tsc --noEmit`, `npm run verify`, `npm run build`

- [x] **Schritt 1: Layout.tsx verfeinern**
  Hintergrund-Tiefeneffekt mit dezentem Verlauf (`var(--color-bg)` zu `var(--color-bg-deep)`).
  Isolierung via `aria-hidden` und `inert` für mobilen Drawer strikt beibehalten.
- [x] **Schritt 2: Header.tsx (Topbar) V2-Styling**
  Subtiler Glassmorphism-Hintergrund (`backdrop-filter: blur(8px)`, Border soft).
  Klare visuelle Hierarchie für Breadcrumb und View-Title.
- [x] **Schritt 3: Sidebar.tsx – Buttons für Kategorien mit ARIA-Semantik & ID-Targeting**
  Ersetze das klickbare `div` der Kategorien durch einen `<button type="button">`:
  - `aria-expanded={isOpen}`
  - `aria-controls={`nav-category-items-${cat.id}`}`
  - Volle Tastatur-Fokussierbarkeit (`focus-visible`).
  - Der Container der Untereinträge erhält `id={`nav-category-items-${cat.id}`}`.
  - Verfeinerung der aktiven Links (`NavLink` mit cyanfarbenem Indikator/Subtlem Glow).
- [x] **Schritt 4: SimulationBar.tsx V2-Styling**
  Kartenartige Kapselung der Live-Metriken mit dezentem Glass-Effekt.

---

## Task 5: Screenshot-Harness (6 Flows, Loading, Reduced Motion), Gates und Übergabe

**Files:**
- Create: `scripts/captureAuftrag028GateScreenshots.mjs`, `docs/screenshots/auftrag-028/README.md`
- Modify: `docs/BUILD_LOG.md`

- [x] **Schritt 1: Standalone CDP-Harness für Auftrag 028 erstellen**
  Unterstützt `--stage=vorher` (mit `--preview-dir` gegen einen temporären Baseline-Worktree auf `210fd9a`) und `--stage=nachher`.
  Prüft zwingend die folgenden **sechs konkreten Flows**:
  1. `dashboard`: Executive Dashboard (`/dashboard`)
  2. `company-profile`: Unternehmenssteckbrief (`/company/profile`)
  3. `crm-deals`: CRM Deals (`/crm/deals`)
  4. `organisation-team`: Organisation Teamstruktur (`/organisation/team`)
  5. `mobile-sidebar`: Mobiler Drawer (Drawer offen, Inhaltsbreite)
  6. `unknown-route-404`: 404-Seite mit sichtbarem `Card variant="glass"`
  Zusätzliche programmatische Verifikationen im Harness:
  - **Button Loading Test**: Dynamischer DOM-Render/Toggle-Check, der nachweist, dass `Button` bei `loading={true}` den Spinner anzeigt und `disabled` ist.
  - **Reduced Motion Test**: Emulation von `Emulation.setEmulatedMedia` mit `features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]` und Assertion, dass Animationen gestoppt sind.
- [x] **Schritt 2: Vorher-Lauf ausführen**
  Erfasse die 18 Vorher-Screenshots gegen Baseline `210fd9a`.
- [x] **Schritt 3: Nachher-Lauf ausführen**
  Erfasse die 18 Nachher-Screenshots gegen die fertige Implementierung.
- [x] **Schritt 4: Matrix & SHA-256 Hashes dokumentieren**
  Erstelle `docs/screenshots/auftrag-028/README.md` mit 18 Bildpaaren. Alle Paare müssen `✅ DISTINCT` sein und 0px Overflow aufweisen.
- [x] **Schritt 5: Alle Gates fahren und Schutzbereichs-Diff prüfen**
  ```bash
  npx tsc --noEmit
  npm run verify
  npm run build
  git diff 210fd9a..HEAD -- src/simulation src/types src/context src/services/data src/features/resources
  ```
- [x] **Schritt 6: BUILD_LOG.md Abschlussbericht eintragen**
  Dokumentiere alle Änderungen, Versionen, Gate-Ergebnisse und Bestätigungen.

---

## Abnahmekriterien (Gate G12)

- [x] `Card.tsx` ist direkt zur GlassCard erweitert; es gibt keine parallele zweite Kartenkomponente.
- [x] Bestehende Aufrufe von `<Card>` und `<Card featured>` rendern ohne visuelle Brüche oder Regressionen.
- [x] 404-Seite nutzt `Card variant="glass"` als sichtbaren Nachweis.
- [x] Klickbare Sidebar-Kategorien sind echte `<button>`-Elemente mit `aria-expanded` und `aria-controls` auf das passende `id={`nav-category-items-${cat.id}`}`.
- [x] Kern-Primitives (`Button`, `Badge`, `StatusChip`, `Alert`) unterstützen einheitliche States (Hover, Focus, Disabled, Loading mit Spinner).
- [x] Kein unpassender Dauer-Loading-Spinner auf Standard- oder 404-Seiten; `Button loading`-Verhalten wird im Harness automatisiert nachgewiesen.
- [x] `prefers-reduced-motion` wird im CSS und per Hook `useReducedMotion` respektiert und im Harness nachgewiesen.
- [x] Die 6 definierten Flows (Dashboard, Company Profile, CRM Deals, Organisation Team, mobiler Drawer, 404) sind auf 1440px, 768px und 375px fehlerfrei und ohne horizontalen Overflow.
- [x] Tastaturfalle, Escape-Schließen, `aria-hidden` und `inert` im mobilen Drawer funktionieren lückenlos.
- [x] `npx tsc --noEmit` hat 0 Fehler.
- [x] `npm run verify` besteht alle 25 Suiten.
- [x] `npm run build` erzeugt fehlerfrei das Produktions-Bundle.
- [x] `git diff 210fd9a..HEAD -- src/simulation src/types src/context src/services/data src/features/resources` liefert genau 0 Zeilen Diff.
- [x] 36 Screenshots (18 Vorher/Nachher-Paare) liegen unter `docs/screenshots/auftrag-028/` vor; 18/18 Paare sind `✅ DISTINCT` und haben 0px Overflow.
- [x] `docs/BUILD_LOG.md` enthält den vollständigen Abschlussbericht.
