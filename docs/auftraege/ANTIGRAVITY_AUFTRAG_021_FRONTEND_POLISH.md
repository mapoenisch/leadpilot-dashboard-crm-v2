# ANTIGRAVITY AUFTRAG 021 — Frontend-Design-Optimierung (voller Durchlauf)

**Phase:** 5 (Post-V1.1) · **Gate:** G5
**Referenz:** `readme.md` (LeadPilot Design System), `guidelines/*.html`, `tokens/*.css`, `src/styles/global.css`
**Voraussetzung:** V1.1.0 + AUFTRAG 020 abgeschlossen, `npm run verify` 25/25.
**Kein Eingriff** in Simulation/Engine/Services/Repositories. Nur Präsentationsschicht (`src/features/**/*.tsx`, `src/components/**`, `src/styles/**`, `tokens/**`).

---

## 1. Ausgangslage (Ist-Analyse)

| Befund | Zahl / Detail |
|---|---|
| Styling-Ansatz | **Ausschließlich Inline-`style={{}}`**. Kein CSS-Modules, kein styled-components, kein Tailwind. `className` nur in 2 Dateien. |
| CSS-Dateien | genau **eine**: `src/styles/global.css` (Tokens im `:root` + Reset + Scrollbars). |
| Token-Quelle | **doppelt**: `src/styles/global.css` **und** `tokens/*.css` (Root) enthalten dieselben Variablen. Nur `global.css` wird importiert (`main.tsx`). → kein Single Source of Truth. |
| Basis-Komponenten | 13 in `src/components/ui/`: `Alert, Badge, Button, Card, Charts, Divider, Icon, Input, Modal, NavItem, SectionHeader, Table, Tabs`. Sauber token-basiert (`var(--color-…)`). |
| Drift | **47 `.tsx`-Dateien mit Inline-`style={{}}`**, **60 mit rohen `#hex`-Literalen**. Die Views hand-stylen, statt aus `ui/*` zu komponieren. |
| Charts | `src/components/ui/Charts.tsx` — **handgerolltes SVG**, keine Charting-Lib (deps: nur react, react-dom, lucide-react, supabase). |
| Views | ~19 Top-Level-Views + 8 Simulations-Komponenten + CRM-Subviews (30 `.tsx` in `src/features/`). Routing: manueller `activeView`-String-Switch in `App.tsx`, `NAV_CATEGORIES` aus `domain/navData`. |
| Layout | `Layout, Header, Sidebar, SimulationBar`. |
| Marken-Regeln (aus `readme.md`) | Dark Forest Green `#0B211F` · Cyan `#00D9C6` = **einzige** primäre Aktionsfarbe · Orange `#FF7A3D` = Akzent, **3–5 %**, nie gleichwertig mit Cyan · Space Grotesk + Inter · **8-px-Raster** · Card-Radius 20 px, Buttons/Badges Pill · **Glow statt Schatten** · Sentence-Case · **keine Emoji** · „im Zweifel: aufräumen, nicht hinzufügen". |

**Ziel:** Alle Views auf **ein** kohärentes, token-getriebenes System bringen, das den Marken-Regeln folgt und WCAG-AA erfüllt — ohne Build-Umbau, ohne neue Dependency.

---

## 2. Nicht-Ziel

- Kein Wechsel des Styling-Mechanismus auf Tailwind / CSS-Modules / styled-components (D13).
- Keine neue Charting-Library (D15).
- Kein Routing-Refactor (der `activeView`-Switch bleibt).
- Keine neuen Features / keine Änderung an dargestellten Zahlen oder Simulationslogik.
- Kein Redesign der Marke — die `readme.md`-Regeln sind gesetzt, sie werden **durchgesetzt**, nicht neu erfunden.

---

## 3. Entscheidungspunkte

### D13 — Styling-Strategie

| Option | Konsequenz |
|---|---|
| **A — Inline-`style` behalten + Primitives ausbauen + Lint-Regel gegen rohe `#hex`/`px` in Views** ✅ *Empfehlung* | Minimal-invasiv, kein Build-Umbau, kein Bundle-Zuwachs. Views komponieren aus `ui/*` + neuen Layout-Primitives; jeder Rohwert wird zur Token-Referenz. |
| B — CSS-Modules einführen | Sauberere Trennung, aber 47 Dateien migrieren, zwei Stilwelten koexistieren während der Migration. |
| C — Tailwind einführen | Utility-Konsistenz, aber Build-Config, Purge, Klassen-Lernkurve, großer Diff. Overkill für die Projektgröße. |

### D14 — Token Single Source of Truth

| Option | Konsequenz |
|---|---|
| **A — `src/styles/global.css` ist SSOT; `tokens/*.css` daraus generiert *oder* gelöscht (nur `guidelines/*.html` bleibt als visuelle Referenz)** ✅ *Empfehlung* | Ein Ort, der zur Laufzeit zählt. `tokens/` als Doku-Artefakt entweder per Skript ableiten oder entfernen. |
| B — `tokens/*.css` wird SSOT, `global.css` importiert sie | Sauberer konzeptionell, aber `@import`-Kette + Vite-Pfadauflösung, und `global.css` hat zusätzlich Reset/Scrollbars. |

### D15 — Charts

| Option | Konsequenz |
|---|---|
| **A — `Charts.tsx` behalten, nach `dataviz`-Regeln härten (zentrales `chartTheme`, Achsen/Legende/Farbrampe/P10-P90-Band/Histogramm, Dark-Kontrast)** ✅ *Empfehlung* | Keine neue Dependency, Bundle bleibt klein, volle Kontrolle über den Dark-Look. |
| B — Recharts / visx einführen | Weniger Eigencode, aber +Bundle, Dark-Theming-Aufwand, Migration aller Chart-Aufrufer. |

### D16 — Barrierefreiheit-Zielmarke

| Option | Konsequenz |
|---|---|
| **A — WCAG AA: Kontrast, Focus-Sichtbarkeit, Keyboard-Bedienbarkeit, ARIA auf interaktiven Komponenten (Modal, Tabs, Nav), Touch-Targets ≥ 44 px, `prefers-reduced-motion`** ✅ *Empfehlung* | Fester, prüfbarer Standard; axe/Lighthouse als Gate. |
| B — nur visuelle Politur, A11y als eigener späterer Auftrag | Schneller sichtbar, aber die interaktiven Kern-Flows (Modals, Router) bleiben unzugänglich. |

### D17 — Zuschnitt (Split?)

| Option | Konsequenz |
|---|---|
| **A — ein Auftrag, phasenweise committen (Phase 1 → 2-Batches → 3 → 4)** ✅ *Empfehlung wenn am Stück machbar* | Ein zusammenhängender Endzustand. |
| B — 021a (Fundament + Charts + Primitives) und 021b (View-Migration + A11y) | Falls die View-Migration (47 Dateien) zu groß für einen Review wird. Gleiche Gates, in zwei Abnahmen. |

---

## 4. Phasen & Schritte

### Phase 0 — Audit & Inventar (kein Code)

1. **Skills laden:** `web-design-guidelines` (UX/A11y-Compliance), `dataviz` (Charts), optional `frontend-design-agency` (systemische Umsetzung).
2. **Screenshot-Matrix:** `npm run dev`, jede der ~19 Views + 8 Simulations-Komponenten + 4 Modals bei **1440 px / 768 px / 375 px** (Browser-MCP `resize_window` + `browser_take_screenshot`). Ablage als Vorher-Referenz.
3. **Findings-Tabelle** in `docs/BUILD_LOG.md` (Kategorie · Datei · Regelverstoß · Schwere), Kategorien:
   `Token-Drift` · `Komponenten-Inkonsistenz` · `A11y` · `Responsive` · `Hierarchie/Ratio` · `Data-Viz`.
4. **Kontrast-Prüfung** der Token-Paare: `--color-text-muted (#A7B0BA)` auf `--color-bg (#0B211F)` und auf `--color-surface (#123330)`; `--color-primary` als Text; alle Badge-Varianten. AA-Verstöße notieren → fließen in Phase 1 (Token-Anpassung).

**Akzeptanz Phase 0:** Findings-Tabelle + Screenshot-Set committet (`docs/`), keine Code-Änderung.

### Phase 1 — Fundament

5. **Token-SSOT (D14-A):** `tokens/*.css` entweder per kleinem Node-Skript aus `global.css` generieren *oder* löschen; `readme.md` auf die eine Quelle verweisen. Kontrast-Fixes aus Phase 0.4 in `global.css` einarbeiten (z. B. `--color-text-muted` aufhellen bis AA auf beiden Flächen hält).
6. **Lint-Regel (D13-A):** ESLint-Regel *oder* `scripts/`-Check, der rohe `#hex` und nackte `NNpx` in `src/features/**` und `src/components/**` (außer `ui/` interne Primitive-Defs) verbietet. Als `npm run lint:style`, später Gate-Kriterium.
7. **Layout-Primitives** neu in `src/components/ui/` (alle token-basiert, `style`-durchreichend):
   - `Stack` (vertikal/horizontal, `gap` als Token-Stufe)
   - `Grid` (responsive Spalten, `minColWidth`)
   - `PageHeader` (Titel + Kontext-Label + optionale primäre Aktion — erzwingt „**eine** primäre Aktion")
   - `StatTile` (KPI-Kachel: Label, Wert, Δ-Badge, optional Sparkline)
   - `FieldRow` (Label-Wert-Paar für Detail-/Audit-Ansichten)
   - `EmptyState`, `Toolbar`
8. **Basis-Komponenten-Lücken schließen:** `Modal` — `max-width: min(<var>, calc(100vw - 2rem))`, `max-height: calc(100dvh - 2rem)`, `overflow-y:auto`, Focus-Trap, `aria-modal`, ESC schließt, Rückgabe-Focus. `Table` — verpflichtender `overflow-x:auto`-Wrapper. Neu: `Select`, `Tooltip`. `Button` — `flex-shrink:0`, `white-space:nowrap`, sichtbarer Focus-Ring (`--focus-ring`).

**Akzeptanz Phase 1:** `npm run verify` 25/25, `npm run build` grün, `npm run lint:style` existiert (darf noch Treffer melden), neue Primitives mit Kurz-Doku im `readme.md`.

### Phase 2 — View-Migration (in Batches)

9. Views in ~5 Batches (thematisch: `overview`+`unternehmen`+`produkt`; `markt`+`kunden`+`geschaeftsmodell`; `vertrieb`+`finanzen`+`organisation`; `strategie`+`recht`+`projektkontext`+`generic`; `crm/*`+`resources/*`; `simulation/*` zuletzt, weil am jüngsten). Pro Batch:
   - Inline-`style`-Nester → `Stack`/`Grid`/`PageHeader`/`StatTile`/`Card`/`Table`.
   - Rohe `#hex` → Token. Rohe `px` → `--space-*` / `--radius-*`.
   - Marken-Checkliste je View: eine primäre Aktion, Cyan/Orange-Ratio, 8-px-Raster, Sentence-Case, keine Emoji, Glow statt Schatten.
   - **Ein Commit je Batch**, Vorher/Nachher-Screenshot (3 Breiten) an den Commit.
10. `App.tsx`/`Sidebar`/`Header`/`SimulationBar` mit denselben Primitives; Nav keyboard-bedienbar (`role`, `aria-current`, Pfeiltasten).

**Akzeptanz Phase 2:** nach jedem Batch `verify` 25/25 + `build` grün + `lint:style` für die migrierten Dateien 0 Treffer + kein horizontaler Body-Scroll auf 375 px.

### Phase 3 — Charts (D15-A)

11. `src/components/ui/chartTheme.ts` — zentrale Achsen-, Gitter-, Legenden-, Tooltip-, Farbrampen-Definition (Median-Linie, P10/P90-Band, Zielpfad, Histogramm-Marker, Trade-Off-Dimensionsfarben) nach `dataviz`-Regeln, alles aus Tokens, Dark-Kontrast AA.
12. `Charts.tsx` + `KpiTimeSeriesDetailView` + `MultiScenarioComparisonModal` + `ManagementTierView`-Sparklines auf `chartTheme` umstellen. Keine dupliziierte Chart-Semantik in Komponenten.

**Akzeptanz Phase 3:** Charts in beiden „Themes" (die App ist Dark-only, aber Kontrast gegen `--color-bg` **und** `--color-surface` prüfen), Legenden/Achsen lesbar bei 375 px, `verify` 25/25.

### Phase 4 — Politur & A11y (D16-A)

13. Pro View: Hierarchie schärfen (Whitespace nach 8-px-Raster, eine Betonung pro Sektion), konsistente Header/Empty-States/Fehlerzustände über die neuen Primitives.
14. A11y-Durchlauf: Focus-Ring überall sichtbar; `aria-*` auf `Modal`, `Tabs`, `NavItem`, `Alert`; Touch-Targets ≥ 44 px; `@media (prefers-reduced-motion: reduce)` in `global.css`; alle Icon-only-Buttons mit `aria-label`.
15. `axe`-Lauf (über Browser-MCP `execute_javascript` mit axe-core als Inline-Script) + Lighthouse-Accessibility je View; kritische Verstöße = 0.

**Akzeptanz Phase 4:** axe 0 kritisch, Kontrast AA durchgängig, Keyboard-Durchlauf durch alle interaktiven Flows dokumentiert.

### Phase 5 — Abschluss

16. `readme.md` + `guidelines/` mit dem realen Endzustand abgleichen (Doku-Drift beseitigen: reale Token-Werte, reale Radius-Skala — `readme.md` sagt „Card 20 px", `global.css` hat `--radius-*` max 16 px → klären und angleichen).
17. `docs/BUILD_LOG.md` Gate-G5-Eintrag mit Vorher/Nachher-Übersicht. `BUILD_PLAN.md` Phase 5 auf ✅.

---

## 5. Gate G5 — Abnahmekriterien

- [ ] `npx tsc --noEmit` EXIT 0
- [ ] `npm run verify` **25/25** (UI-Suite 007 unverändert grün)
- [ ] `npm run build` EXIT 0, **kein** Chunk-Size-Warning
- [ ] `npm run lint:style` = **0 Treffer** in `src/features/**` und `src/components/**` (rohe `#hex` / nackte `px` nur noch in `tokens/`+`global.css`+Primitive-Interna)
- [ ] **Ein** Token-SSOT; `tokens/*.css` generiert oder entfernt
- [ ] Jede der ~19 Views + 4 Modals: Vorher/Nachher-Screenshot @ 1440 / 768 / 375; kein horizontaler Body-Scroll, keine geclippten Controls, keine überlappenden Elemente
- [ ] Marken-Checkliste je View bestanden: **eine** primäre Aktion pro Sektion · Cyan = einzige Primärfarbe · Orange ≤ 5 % Fläche · 8-px-Raster · Sentence-Case · keine Emoji · Glow statt Drop-Shadow
- [ ] axe-core: **0 kritische** Verstöße pro View · Kontrast durchgängig **AA** · sichtbarer Focus-Ring auf allen interaktiven Elementen · alle interaktiven Flows per Tastatur bedienbar · `prefers-reduced-motion` respektiert
- [ ] Charts: zentrales `chartTheme`, keine dupliziierte Chart-Semantik, lesbar bei 375 px
- [ ] `readme.md` / `guidelines/` = realer Endzustand (Doku-Drift = 0)
- [ ] Simulation/Engine/Services **unverändert** (Grep-Nachweis: kein Diff außerhalb `src/features/**`, `src/components/**`, `src/styles/**`, `tokens/**`, `readme.md`, `docs/**`)

---

## 6. Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| View-Migration (47 Dateien) zu groß für einen Review | Batches à ~5 Views, je ein Commit + Screenshot-Diff; bei Bedarf D17-B (Split 021a/021b) |
| Kein visuelles Regressionstest-Setup → unbemerkte Regressionen | Manueller Screenshot-Vergleich per Browser-MCP pro Batch; optional als Nachtrag Playwright-Screenshot-Baseline |
| `Charts.tsx` custom SVG, kein Snapshot | Sichtprüfung Pflicht; `chartTheme` isoliert testen (Farbwerte, Skalen-Funktionen als reine Funktionen) |
| Token-Umbenennung bricht `var(--…)`-Referenzen | Keine Umbenennung — nur Werte anpassen + neue Tokens ergänzen; alte Namen behalten |
| UI-Suite 007 hängt an konkreter DOM-Struktur | Vor Phase 2 lesen, was `runUiTest` assertet; Migration die Assertions-Anker (Text/`data-*`) erhalten lassen |
| `readme.md` sagt Radius 20 px, Code hat 16 px | In Phase 5 bewusst entscheiden (Code an Doku oder Doku an Code), nicht stillschweigend beides lassen |

---

## 7. Reihenfolge für den Coding-Agent

1. Phase 0 komplett (Screenshots + Findings-Tabelle) → committen.
2. Phase 1 (Token-SSOT, Lint-Regel, Primitives, Basis-Komponenten-Lücken) → `verify`/`build` → committen.
3. Phase 2 batchweise (5 Commits) → je Batch `verify`/`build`/`lint:style`/Screenshots.
4. Phase 3 (`chartTheme` + Umstellung) → committen.
5. Phase 4 (Politur + A11y + axe) → committen.
6. Phase 5 (Doku-Abgleich, Gate-G5-Checkliste, BUILD_LOG/BUILD_PLAN) → Abschluss-Commit `feat(auftrag-021): frontend design system polish (tokens, primitives, a11y, charts)`.
