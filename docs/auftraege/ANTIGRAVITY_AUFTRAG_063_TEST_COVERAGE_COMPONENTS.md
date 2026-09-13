# AUFTRAG 063 / Gate G43 (Fortsetzung) — Test-Coverage `components/`

**Baseline:** `4476c95` (Auftrag 062 Review abgeschlossen) · **Branch:** `codex/v2.2.0-haertung` · **Status:** OFFEN

Zweiter der drei in Auftrag 061 angekündigten Folgeaufträge. Schließt **ausschließlich Kennzahl
#16** (Test-Coverage `src/components/**`, 0 % → ≥ 60 %). Gate G43 bleibt danach weiterhin offen
(#13, #14, #21, #22 unverändert offen; #4 seit Auftrag 062 erfüllt).

## Ziel

1. **Statement-Coverage von `src/components/**` von 0 % auf ≥ 60 % im Aggregat** (nicht je Datei
   — siehe Entscheidung 2). Gemessen per `npx vitest run --coverage`, Zeile `components` in der
   Ordner-Rollup-Ausgabe.
2. **`scripts/verifyV22ReleaseReadiness.ts` von hartkodierten Coverage-Literalen auf echte
   Messung umstellen** (Metriken #14, #15, #16) — siehe Entscheidung 3.
3. Beobachtungspunkt aus dem Auftrag-062-Review: **nur prüfen, nicht beheben** — falls in diesem
   Auftrag ein Component tatsächlich `HistoricalActivity`-Daten rendert (aktuell nicht der Fall),
   den offenen Befund zur `simulatedCrmSource.ts`-Mapping-Logik (`docs/BUILD_LOG.md`, Auftrag-062-
   Review) im Bericht erwähnen, statt ihn stillschweigend zu ignorieren.

## Ist-Stand (nachgemessen)

`src/components/**`: **57 Dateien, 8.294 Zeilen, 0 % Coverage über alle Unterordner** (Statements,
Branches, Funktionen, Zeilen — vollständig ungetestet, per `npx vitest run --coverage`
verifiziert).

| Unterordner | Dateien | Charakter |
|---|---|---|
| `components/ui/` (ohne `charts/`) | 20 | Basis-Primitives (Button, Card, Input, Modal, Table, Tabs, Select, …) — keine externen Chart-Libs, größtenteils reine Präsentationskomponenten |
| `components/ui/charts/` | 16 | Chart-Wrapper um `recharts` (Donut-, Waterfall-, Zeitreihen-, Balkendiagramme) |
| `components/liveKpi/` | 7 | Live-KPI-Widgets, nutzen `recharts` + `framer-motion` (u. a. `LiveFunnelBarChart.tsx` 340 Zeilen, `LiveArrMixDonut.tsx` 269 Zeilen) |
| `components/executiveCockpit/` | 6 | Cockpit-Panels, teils Chart-Integration |
| `components/layout/` | 4 | `Sidebar.tsx` (255 Zeilen), `Header.tsx`, `Layout.tsx`, `SimulationBar.tsx` |
| `components/facelift/` | 3 | Branding/Glyph-Komponenten (`FaceliftGlyph.tsx` 242 Zeilen) |
| `components/ai` | 1 | `InsightDrawer.tsx` |

**Dies ist die erste Komponenten-Test-Suite im Projekt** — es existieren bereits Hook-Render-Tests
(`*.ui.vitest.ts(x)` mit `renderHook`, z. B. `src/hooks/__tests__/useLiveKpi.ui.vitest.ts`), aber
noch kein einziger Test, der eine Komponente per `render()` tatsächlich in ein DOM rendert und
über `screen`-Queries prüft. Alle nötigen Bibliotheken sind bereits Projektabhängigkeiten —
**keine neue npm-Installation nötig**: `@testing-library/react` (16.3.3), `@testing-library/jest-
dom` (7.0.1), `@testing-library/user-event` (14.6.7), `jsdom` (25.0.1).

**Namenskonvention (aus G32, `vitest.config.ts`):** Komponenten-Tests laufen im `ui`-Projekt
(jsdom-Umgebung) und müssen auf `*.ui.vitest.tsx` enden, sonst werden sie nicht eingesammelt.

**Fehlende Test-Infrastruktur für Chart-Komponenten:** `vitest.setup.ts` polyfillt bisher nur
`window.matchMedia`. Für `recharts`s `ResponsiveContainer` (verwendet in allen 16 `ui/charts/**`-
und den meisten `liveKpi/**`-Dateien) fehlt ein `ResizeObserver`-Polyfill — jsdom kennt diese API
nicht nativ, ohne Polyfill schlägt das Rendern dieser Komponenten fehl.

**`verifyV22ReleaseReadiness.ts` misst Coverage aktuell nicht wirklich:** Zeilen 333–334 zeigen
hartkodierte Konstanten (`coverageSimulation = 87.27`, `coverageComponents = 0.0`), keine echte
Auswertung eines Coverage-Reports. Nach diesem Auftrag stimmt `coverageComponents = 0.0` nicht
mehr — wird aber ohne Skript-Änderung nicht automatisch aktualisiert.

## Verbindliche Entscheidungen

1. **Keine neuen Abhängigkeiten.** Alle benötigten Test-Bibliotheken sind bereits installiert
   (siehe oben). Kein `package.json`-Dependency-Update in diesem Auftrag.
2. **Ziel ist der Ordner-Aggregatwert, nicht Coverage je Einzeldatei.** Analog zu Kennzahl #15
   (`simulation/` erreicht 87,27 % im Aggregat, obwohl einzelne Dateien wie `decisionMaker.ts`
   oder `reportPresenter.ts` bei 0 % liegen) gilt auch hier: `vitest.config.ts` bekommt **keinen**
   `perFile: true`-Schwellenwert für `src/components/**` (das würde erzwingen, dass buchstäblich
   jede der 57 Dateien einzeln ≥ 60 % erreicht — unrealistisch für z. B. `RouteErrorBoundary.tsx`
   oder reine Re-Export-/Index-Dateien). Stattdessen: Priorität auf die am häufigsten
   wiederverwendeten und umfangreichsten Dateien legen, damit der **Gesamtwert** über 60 % steigt;
   einzelne, schwer sinnvoll testbare Dateien dürfen niedrig bleiben, wenn der Aggregatwert
   trotzdem erreicht wird.
3. **`verifyV22ReleaseReadiness.ts` auf echte Messung umstellen (#14, #15, #16).**
   `vitest.config.ts` `coverage.reporter` um `'json-summary'` ergänzen (liefert
   `coverage/coverage-summary.json` mit Ordner-Rollups). Die drei hartkodierten Konstanten
   (`coverageSimulation`, `coverageComponents`, und die für #14 verwendete `services`+`hooks`-
   Berechnung) durch Parsing dieser Datei ersetzen. Das kommt auch Auftrag 064 zugute, der
   dieselbe Infrastruktur für `services/`+`hooks/` braucht.
4. **Test-Stil: Verhalten prüfen, nicht Snapshots.** `render()` + `screen`-Queries (`getByRole`,
   `getByText`, `getByLabelText`) und `@testing-library/user-event` für Interaktion. Keine
   `toMatchSnapshot()`-Tests — die sind erfahrungsgemäß brüchig und werden bei jeder
   Styling-Änderung blind aktualisiert, ohne echten Prüfwert.
5. **`ResizeObserver`-Polyfill in `vitest.setup.ts` ergänzen** (nur im `jsdom`-Zweig, analog zum
   bestehenden `matchMedia`-Polyfill), bevor die chart-lastigen Blöcke (C, D) begonnen werden.
6. **Reihenfolge nach Testbarkeit, nicht nach Zeilenzahl:** erst die 20 `ui/`-Primitives ohne
   Chart-Abhängigkeit (Block B), dann Layout/Facelift/AI (Block C), dann die 16 Chart-Wrapper und
   die 13 chart-lastigen `liveKpi/`+`executiveCockpit`-Dateien zusammen (Block D). Nach jedem
   Block `npx vitest run --coverage` erneut laufen lassen und den steigenden Aggregatwert für
   `src/components/**` im Bericht dokumentieren.
7. **Scope-Grenze:** Dieser Auftrag ändert **keine** Komponenten-Logik oder -Struktur, nur Tests
   und die in Entscheidung 3/5 genannte Test-Infrastruktur. Fällt beim Testen ein echter Bug in
   einer Komponente auf: dokumentieren, nicht reparieren (stoppen und Rückfrage), außer es ist ein
   trivialer, für den Test notwendiger Fix ohne Verhaltensänderung (z. B. fehlendes `aria-label`
   für eine sinnvolle `getByRole`-Query — das darf ergänzt werden, mit Nennung im Bericht).

## Grenzen und Schutzbereiche

Keine der 57 Zieldateien liegt in einem Schutzbereich (`src/components/**` ist nicht geschützt).
Trotzdem Pflicht: `git diff 4476c95 -- src/simulation src/types src/context src/services/data
src/features/resources` bleibt leer — dieser Auftrag hat keinen Grund, dort etwas zu ändern.

## Blöcke

### Block A — Test-Infrastruktur

- `vitest.setup.ts`: `ResizeObserver`-Polyfill im jsdom-Zweig ergänzen.
- `vitest.config.ts`: `coverage.reporter` um `'json-summary'` ergänzen.
- `scripts/verifyV22ReleaseReadiness.ts`: Metriken #14, #15, #16 von hartkodierten Literalen auf
  Parsing von `coverage/coverage-summary.json` umstellen (Voraussetzung: `npx vitest run
  --coverage` muss vorher gelaufen sein — im Skript per `execSync` orchestrieren, analog zu den
  anderen Metriken dort).

### Block B — `components/ui/` ohne Charts (20 Dateien)

Alert, Badge, Button, Card, Charts, Checkbox, Divider, Icon, Input, Modal, NavItem,
NumberStepper, RouteErrorBoundary, SectionHeader, Select, Skeleton, StatusChip, Table, Tabs,
Toolbar. Rendering, Props-Varianten, Interaktion (Klick, Eingabe, Tastatur bei Select/Tabs),
Accessibility-Rollen.

### Block C — Layout, Facelift, AI (8 Dateien)

`components/layout/*` (Header, Layout, Sidebar, SimulationBar), `components/facelift/*`
(BrandDiagramCanvas, FaceliftGlyph, MetricToken), `components/ai/InsightDrawer.tsx`.

### Block D — Charts & Live-KPI (29 Dateien)

`components/ui/charts/*` (16), `components/liveKpi/*` (7), `components/executiveCockpit/*` (6).
Benötigt den `ResizeObserver`-Polyfill aus Block A. Fokus auf Rendering ohne Absturz, korrekte
Anzeige übergebener Werte/Labels, Leerzustände (`ChartEmptyState`), keine Pixel-genaue
Chart-Geometrie-Prüfung (dafür ist Playwright Visual Regression zuständig, nicht Unit-Tests).

## Erlaubte Dateien

| Datei/Muster | Zweck |
|---|---|
| `src/components/**/*.ui.vitest.tsx` (57 neue Testdateien) | Block B–D |
| `vitest.setup.ts` | Block A, `ResizeObserver`-Polyfill |
| `vitest.config.ts` | Block A, `json-summary`-Reporter |
| `scripts/verifyV22ReleaseReadiness.ts` | Block A, echte Coverage-Messung #14/#15/#16 |
| `src/components/**/*.tsx` | nur triviale, testnotwendige Ergänzungen laut Entscheidung 7 (z. B. `aria-label`), keine Verhaltensänderung |
| `docs/releases/V2.2.0.md`, `docs/BUILD_LOG.md` | Abschlussbericht |

## Pflicht-Verifikation

```
npx vitest run --coverage                 # components/ Aggregat ≥ 60 % (Statements)
npx tsc --noEmit                          # weiterhin 0 Fehler
npm run lint                               # weiterhin 4 Fehler (Metrik #13, unverändert), 0 Warnungen
npm run format:check                       # 85 Abweichungen (unverändert, sofern keine neue Datei betroffen)
npm run verify                             # 24/24 Suiten grün
npm test                                   # bestehende 140 Tests weiterhin grün + neue Component-Tests
npm run build                              # Produktions-Build grün
npx playwright test                        # 165/165, insbesondere 15/15 Visual Regression bei 0px Diff
npx tsx scripts/verifyV22ReleaseReadiness.ts   # #16 zeigt echten Aggregatwert ≥ 60 %, nicht mehr 0.0
git diff 4476c95 -- src/simulation src/types src/context src/services/data src/features/resources   # leer
```

## Builder-Bericht

Neuer Abschnitt am Ende von `docs/BUILD_LOG.md`: Ziel & Kontext, Anzahl neuer Testdateien je
Block, Coverage-Aggregatwert für `src/components/**` nach jedem Block (0 % → … → ≥ 60 %),
Nachweis, dass `verifyV22ReleaseReadiness.ts` jetzt echte Werte statt Literale liefert, kurze
Erwähnung des Beobachtungspunkts zu `simulatedCrmSource.ts` (siehe Ziel 3), vollständige
Verifikationsmatrix, Ergebnis & Übergabe an den Prüfer.

## Akzeptanzkriterien für die Prüfung

- Unabhängig gemessener `npx vitest run --coverage`-Aggregatwert für `src/components/**` liegt
  bei ≥ 60 % Statements.
- Keine `toMatchSnapshot()`-Tests.
- `verifyV22ReleaseReadiness.ts` liefert bei unabhängigem Lauf reale (nicht hartkodierte) Werte
  für #14, #15, #16 — Stichprobe: Wert ändert sich, wenn testweise eine Testdatei entfernt wird.
- Bestehende 140 Tests + 165 Playwright-Tests weiterhin grün, keine visuelle Abweichung.
- `git diff` auf die 5 Schutzbereichspfade bleibt leer.
