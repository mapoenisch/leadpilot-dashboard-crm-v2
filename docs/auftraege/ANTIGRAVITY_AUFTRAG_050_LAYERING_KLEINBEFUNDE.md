# AUFTRAG 050 / Gate G35 — Layering-Verstöße + Kleinbefunde (ohne Simulation-Massentypung)

**Builder:** OpenCode
**Prüfung:** Codex / Claude Code
**Baseline:** G34-Freigabe (`7b19a20`)
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Plan:** `docs/BUILD_PLAN_V2.2.0.md` (Phase 2), Bezug `docs/QUALITY_BASELINE_V2_2_0.md`

## Ziel

Die Analyse in `docs/QUALITY_BASELINE_V2_2_0.md` hat die tatsächlichen
Kleinbefunde beziffert — deutlich mehr als der Plan-Kopf nannte. Dieser Auftrag
räumt den **architektonisch bedeutsamen** Teil ab und die mechanischen
Kleinbefunde **außerhalb der geschützten `src/simulation/`-Zone**:

- die 7 vertikalen Schichtverstöße (`import/no-restricted-paths`)
- den 1 horizontalen Feature-zu-Feature-Verstoß (`LiveSimulationPage`)
- ein zentraler Logger statt verstreuter `console.*` (nur außerhalb `src/simulation/`)
- 8 klickbare `<div>` → Tastatur-bedienbar; der 1 bekannte Axe-Verstoß
- ErrorBoundary-Abdeckung geprüft und lückenlos
- die 3 offenen `tsc`-Fehler in `liveKpiStreamStore.ts`
- `any` / `no-unused-vars` / `prefer-const` / leere Muster / `exhaustive-deps`
  **außerhalb `src/simulation/`**

### Ausdrücklich NICHT in diesem Auftrag (separat beauftragt)

| Ausgeklammert | Umfang | Ziel |
| --- | --- | --- |
| `src/simulation/`-Typhärtung | ~66 `any`, ~61 `console.*`, ~31 `no-unused-vars`, 5 `prefer-const`, ~526 `tsc`-Fehler (`noUncheckedIndexedAccess` u. a.) | **Auftrag 050-B / G35-B** (Folgeauftrag, geschützte Zone, eigener Review) |
| `max-lines` (16 Feature-Dateien) | Riesenkomponenten zerlegen | **G40 / Auftrag 058** (dort ohnehin „19 Riesenkomponenten zerlegen") |
| Enforcing-Regel für horizontale Feature-Grenze | `eslint-plugin-boundaries` o. Ä. | **G38 / Auftrag 053** (dort wird die ESLint-Config ohnehin verschärft). In diesem Auftrag wird der **eine bekannte Verstoß behoben**, nicht die Regel gebaut. |

Grund für die Teilung: Layering-Refactors und eine mechanische Typ-/`console`-Flut
in der größten geschützten Zone dürfen sich keinen Review teilen (Diff sonst nicht
prüfbar; „kein Big-Bang", `CLAUDE.md` §8).

## Verbindliche Entscheidungen

1. **Keine neue npm-Abhängigkeit.** Der zentrale Logger ist ein eigenes, kleines
   Modul ohne Fremdcode. Die horizontale Grenz-Regel kommt erst in G38.
2. **Kein Verhaltenswechsel, keine optische Änderung.** Alle Layering-Fixes sind
   reines Verschieben / Umbenennen / Dependency-Injection. Beweis: Playwright
   147/147 gegen die **bestehenden** Baselines (kein `--update-snapshots`),
   `npm run verify` 24/24, alle Vitest grün, `verifyLivePerformanceSurface.ts`
   grün.
3. **`src/simulation/` bleibt unangetastet** — mit **einer** benannten Ausnahme:
   `src/simulation/__tests__/dataSourceIntegrity.test.ts` darf **nur in der
   Import-Zeile** angepasst werden (Block A5). Kein anderer Eingriff in
   `src/simulation/**`. `git diff 7b19a20 -- src/simulation` muss danach genau
   diese eine Datei mit genau dieser einen Zeilenänderung zeigen.
4. **Geschützte Zonen** (`CLAUDE.md` §6): dieser Auftrag fasst `src/services/**`,
   `src/types/**` und `src/domain/**` an. Das ist **ausdrücklich erlaubt**, aber
   nur im hier beschriebenen Umfang (Layering-Fix + mechanische Kleinbefunde).
   RNG/Seed, Run-/Versionsmodell, Persistenzlogik, `crmRepository.ts`-Schreibpfade
   bleiben unberührt. `DataSource`-Vertrag (`src/types/dataSource.ts`) bleibt
   bytegleich.
5. **`liveKpiStreamStore.ts` / `liveKpiReadAdapter.ts`**: nur Block F (3 `tsc`-
   Fixes). `LiveKpiReadStatus` bytegleich, keine Logik-Änderung, kein
   `subscribeToLiveKpi`-Wiederaufleben.
6. **Ein Commit pro Block (A–H).** Reihenfolge A → H. Jeder Commit für sich grün
   (`npm run verify` + Vitest). So kann der Review blockweise prüfen.
7. **CI-Ratsche nachziehen:** `.github/workflows/ci.yml` `LINT_BASELINE` /
   `TSC_BASELINE` nach Block H auf die neuen Ist-Werte senken (siehe
   Pflicht-Verifikation). Nie erhöhen.

## Blöcke

### Block A — 7 vertikale Schichtverstöße

Erlaubte Richtung (aus `eslint.config.js`): `app → features → components →
services → (simulation | domain | types)`. Rückwärts = Verstoß.

- [ ] **A1 `src/domain/eventRules.ts` löschen.** Datei ist ein toter Barrel
  (`export * from '../simulation/eventRules'`). **Niemand importiert den
  domain-Barrel** — alle 7 realen Nutzer importieren `simulation/eventRules`
  direkt. `grep -rn "domain/eventRules\|domain['\"]" src` muss nach dem Löschen
  0 ergeben.
- [ ] **A2 `src/domain/executiveCockpitData.ts`: `domain → services` auflösen.**
  Importiert `@/services/db/crmRepository` (`CRMRepository`). Dependency
  invertieren: die Funktion(en), die `CRMRepository` brauchen, bekommen die
  benötigten Daten (oder ein schmales, in `src/types/` oder `src/domain/`
  definiertes Interface) **als Parameter** übergeben. Aufrufer (in `features/`
  oder `app/`) reichen das Repository herein. `@/types/crm` darf bleiben
  (`domain → types` ist erlaubt).
- [ ] **A3 Baseline-JSON verschieben.** `src/services/data/sources/baselineFileSource.ts`
  (Zeilen 4–5) und `hubSpotBaselineSource.ts` (Zeile 5) laden per dynamischem
  `import()` aus `src/features/crm/data/baselines/*.json`. Die drei Dateien
  - `baseline-2026-08-31-v1.json`
  - `baseline-2026-09-15-v2.json`
  - `baseline-hubspot-2026-09-01.json`
  nach **`src/services/data/baselines/`** verschieben (`git mv`), Import-Pfade
  anpassen. Prüfen, ob noch andere Stellen diese Dateien referenzieren
  (`grep -rn "data/baselines/" src`) und mitziehen. Die Fixture
  `baseline-hubspot-fixture.json` (aus `simulation/__tests__/fixtures/`) bleibt
  wo sie ist — `services → simulation/__tests__` wird von der Regel nicht
  geahndet; nicht anfassen.
- [ ] **A4 `src/features/crm/data/rawCsvData.ts` verschieben.** Einziger Nutzer
  ist `src/services/import/crmImporter.ts`. Nach **`src/services/import/rawCsvData.ts`**
  verschieben (`git mv`), Import in `crmImporter.ts` auf relativ/`@/services/...`
  umstellen.
- [ ] **A5 `resolveRunSourceAudit` aus der Feature-Komponente herauslösen.**
  Aktuell in `src/features/simulation/components/AuditTierView.tsx:23` definiert
  und exportiert; genutzt von `AuditTierView.tsx` selbst **und** von
  `src/simulation/__tests__/dataSourceIntegrity.test.ts:5`. Die **reine Funktion**
  `resolveRunSourceAudit` (+ zugehöriger Typ `RunSourceAuditInfo`) nach
  **`src/services/data/runSourceAudit.ts`** verschieben. `AuditTierView.tsx`
  importiert von dort. `dataSourceIntegrity.test.ts` — **nur Zeile 5** — auf
  `../../services/data/runSourceAudit` umstellen (`simulation → services` ist
  erlaubt). Kein weiterer Eingriff in die Testdatei.
- [ ] **A6 Verifizieren:** `npx eslint "src/**/*.{ts,tsx}"` meldet **0**
  `import/no-restricted-paths`-Treffer (vorher 7).

### Block B — 1 horizontaler Feature-Verstoß

- [ ] **B1 `LiveSimulationPage` verschieben.** `src/features/crm/pages/LiveSimulationPage.tsx`
  (5-Zeilen-Wrapper um `@/features/simulation/LiveDashboardView`) nach
  **`src/features/simulation/pages/LiveSimulationPage.tsx`** verschieben.
- [ ] **B2 `src/features/crm/CRMView.tsx` entkoppeln.** Der Import
  `./pages/LiveSimulationPage` und der `SUBVIEW_MAP`-Eintrag `'s-live-simulation'`
  müssen aus `CRMView.tsx` verschwinden (sonst importiert `features/crm` weiter
  aus `features/simulation`). Die Route `s-live-simulation` wird über
  `src/app/routePages.tsx` bedient (dort schon als `React.lazy` vorhanden,
  Pfad auf den neuen Ort anpassen). Falls `CRMView` den Eintrag funktional
  braucht: die Komponente per Prop/Registry von `app/` hereinreichen, **nicht**
  direkt importieren. Builder wählt die minimale konsistente Lösung und
  dokumentiert sie im Bericht.
- [ ] **B3** `grep -rn "features/simulation" src/features/crm` = 0 und
  `grep -rn "features/crm" src/features/simulation` = 0.
- [ ] **B4** Im `eslint.config.js`-Kommentarblock zur horizontalen Grenze den
  Satz „Bekannter Verstoß: …LiveSimulationPage…" ersetzen durch den Hinweis,
  dass der Verstoß in G35 behoben ist und die **enforcing Regel** in G38 kommt.
  Keine Regeländerung.

### Block C — Zentraler Logger (nur außerhalb `src/simulation/`)

- [ ] **C1 `src/services/logger.ts` anlegen.** Kleines Modul, kein Fremdcode:
  `logger.debug/info/warn/error(msg, ...args)`. In DEV (`import.meta.env.DEV`)
  an `console` weiterreichen, in PROD `warn`/`error` behalten, `debug`/`info`
  verwerfen (oder in einen Ring-Puffer — Builder entscheidet, dokumentiert).
  Die **einzige** Datei mit erlaubtem `console`-Zugriff; dort ein
  `/* eslint-disable no-console -- zentraler Logger, einzige erlaubte Stelle */`
  **mit Begründung** (`eslint-comments/require-description` ist scharf).
- [ ] **C2** Alle `console.*`-Aufrufe **außerhalb `src/simulation/`** durch
  `logger.*` ersetzen. Laut Baseline: `src/app` 6, `src/features` 4,
  `src/services` 4, `src/components` 2 (Stand kann leicht abweichen — maßgeblich
  ist `npx eslint`). Einschließlich `liveKpiStreamStore.ts` (`notify`-Catch →
  `logger.warn`) und `liveKpiReadAdapter.ts` (falls dort noch eine Stelle ist).
- [ ] **C3** `npx eslint "src/**/*.{ts,tsx}" --rule '{"no-console":"error"}'`
  außerhalb `src/simulation/` = 0 Treffer (Simulation-Rest → 050-B).

### Block D — Barrierefreiheit

- [ ] **D1 8 klickbare `<div>` bedienbar machen.** Treffer:
  `jsx-a11y/no-static-element-interactions` + `jsx-a11y/click-events-have-key-events`
  (je 8, `src/components` 5, `src/features` 3). Pro Stelle: entweder echtes
  `<button type="button">` (bevorzugt, wenn Styling es zulässt) **oder**
  `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space). Keine optische
  Änderung — Klasse/Layout bleiben.
- [ ] **D2 Axe `scrollable-region-focusable` (`/dashboard`).** Das scrollende
  `<main style="overflow-y:auto">` bekommt `tabIndex={0}` und ein
  `aria-label` (z. B. „Hauptinhalt"). Danach `e2e/a11y-baseline.json`:
  den Eintrag `"scrollable-region-focusable"` unter `"/dashboard"` entfernen
  (Liste wird `[]`). `e2e/a11y.spec.ts` bleibt unverändert (Ratsche greift von
  selbst).
- [ ] **D3** `npx eslint` meldet 0 `jsx-a11y/no-static-element-interactions`
  und 0 `jsx-a11y/click-events-have-key-events`.

### Block E — ErrorBoundary-Abdeckung

- [ ] **E1** Prüfen, dass **jede** Route (`src/app/routePages.tsx` /
  Router-Konfiguration) in `src/components/ui/RouteErrorBoundary.tsx` (oder
  gleichwertig) gehüllt ist und dass `src/app/App.tsx` eine oberste Boundary um
  die Provider hat. Lücken schließen. Kein neues Boundary-Framework, bestehende
  Komponente wiederverwenden.
- [ ] **E2** Kurzer Nachweis im Bericht: Tabelle „Route → Boundary" oder ein
  Verweis auf die eine Stelle, die alle Routes umschließt.

### Block F — 3 `tsc`-Fehler in `liveKpiStreamStore.ts`

- [ ] **F1** `noUncheckedIndexedAccess`-Fehler an
  `liveKpiStreamStore.ts` ~Zeile 126 (`deduped[deduped.length - 1]`),
  ~415 (`merged[merged.length - 1]` als `compareSnapshots`-Argument) und
  ~416 (`newSnapshot = latestInMerged`) mit lokalem `const` + `undefined`-Guard
  auflösen. Keine Verhaltensänderung, `commit`-Pfad unangetastet.
- [ ] **F2** `npx tsc --noEmit 2>&1 | grep -c "error TS"` sinkt um genau 3
  gegenüber der Baseline (762 → 759).

### Block G — `no-unused-vars` / `prefer-const` / leere Muster / `exhaustive-deps` (außerhalb `src/simulation/`)

- [ ] **G1 `@typescript-eslint/no-unused-vars`** außerhalb `src/simulation/`
  (Baseline: `src/components` 17, `src/features` 16, `src/services` 3,
  `src/types` 3): ungenutzte Importe/Variablen entfernen; bewusst ungenutzte
  Parameter mit `_` prefixen. Keine Logik anfassen.
- [ ] **G2 `no-empty-pattern`** (1, `src/components`) und
  `@typescript-eslint/no-empty-object-type` (1, `src/components`) beheben.
- [ ] **G3 `react-hooks/exhaustive-deps`** (3: `src/features` 2, `src/hooks` 1):
  Dependency-Arrays korrigieren. Der `src/hooks`-Treffer ist die aus dem
  G34-Review bekannte Stelle (`useLiveKpiActivity.ts`, unnötige `version`-Dep) —
  Dep entfernen **oder**, falls dann eine echte Dep fehlt, sauber ergänzen; die
  Signatur `{ items, status }` und das Aggregations-Verhalten bleiben gleich
  (mit den vorhandenen Hook-Tests absichern).
- [ ] **G4 `prefer-const`**: laut Baseline alle 5 Treffer in `src/simulation/`
  → **nicht hier**, gehört zu 050-B. Falls `npx eslint` einen außerhalb
  `src/simulation/` zeigt: beheben.

### Block H — `any` außerhalb `src/simulation/` + Ratsche

- [ ] **H1 `@typescript-eslint/no-explicit-any`** außerhalb `src/simulation/`
  (Baseline: `src/features` 29, `src/components` 14, `src/services` 12,
  `src/types` 4 ≈ 59) durch **echte Typen** ersetzen. Wo ein präziser Typ
  unverhältnismäßig ist: `unknown` + Narrowing, **nicht** `any`, **kein**
  `eslint-disable`. `src/types/**`-Änderungen dürfen keine bestehende
  Signatur brechen (`npm run verify` + Vitest + `tsc`-Zähler beweisen es).
- [ ] **H2 Ratsche senken.** In `.github/workflows/ci.yml`:
  `LINT_BASELINE` auf den neuen `npm run lint`-Ist-Wert,
  `TSC_BASELINE` auf den neuen `npx tsc --noEmit`-Ist-Wert. Werte in den
  Bericht. Ein realer Push, damit CI die neuen Schwellen bestätigt.

## Grenzen und Schutzbereiche

- Unverändert (Diff leer, außer wo ein Block es ausdrücklich nennt):
  `src/simulation/**` (Ausnahme: 1 Import-Zeile in `dataSourceIntegrity.test.ts`),
  `src/context/**`, `src/services/data/**`-Verträge (`dataSource.ts`),
  `supabase/**`, `tools/n8n/**`, `public/**`, `scripts/**`, `vitest.config.ts`,
  `e2e/**` **außer** `e2e/a11y-baseline.json` (Block D2),
  `.github/workflows/ci.yml` **außer** den zwei Baseline-Zahlen (Block H2).
- `package.json` / `package-lock.json`: **nicht** anfassen (keine neue Dep).
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe — **außer** dem einen
  CI-Bestätigungs-Push aus H2 auf `codex/v2.2.0-haertung` (kein Merge, kein Tag).

## Erlaubte Dateien

| Bereich | Blöcke |
| --- | --- |
| `src/domain/**` (Löschen `eventRules.ts`, DI in `executiveCockpitData.ts`) | A1, A2 |
| `src/services/data/**`, `src/services/import/**` (neue `logger.ts`, `runSourceAudit.ts`, verschobene Baselines/CSV) | A2–A5, C1 |
| `src/services/**` allgemein (console→logger, any, unused) | C2, G1, H1 |
| `src/features/**` (Page-Umzug, a11y, console→logger, any, unused, deps) | B1, B2, C2, D1, G1, G3, H1 |
| `src/features/simulation/pages/LiveSimulationPage.tsx` (neu) | B1 |
| `src/features/simulation/components/AuditTierView.tsx` (Import-Umstellung) | A5 |
| `src/app/**` (routePages, App, console→logger, ErrorBoundary) | B2, C2, E1 |
| `src/components/**` (a11y, console→logger, any, unused, leere Muster) | C2, D1, G1, G2, H1 |
| `src/hooks/useLiveKpiActivity.ts` (nur Dep-Array) | G3 |
| `src/services/liveKpi/liveKpiStreamStore.ts`, `liveKpiReadAdapter.ts` (nur Block F + evtl. 1 console→logger) | C2, F1 |
| `src/simulation/__tests__/dataSourceIntegrity.test.ts` (**nur** Import-Zeile 5) | A5 |
| `src/types/**` (any, unused — ohne Vertragsbruch) | G1, H1 |
| `e2e/a11y-baseline.json` (`/dashboard` → `[]`) | D2 |
| `eslint.config.js` (nur Kommentarblock) | B4 |
| `.github/workflows/ci.yml` (nur `LINT_BASELINE` / `TSC_BASELINE`) | H2 |
| `docs/BUILD_LOG.md`, dieser Auftrag | Bericht |

Andere Dateien sind nicht erlaubt.

## Pflicht-Verifikation

```bash
npm run verify                       # 24/24 grün — nach JEDEM Block-Commit
npm run test                         # alle Vitest grün
npm run test:coverage                # liveKpi/** + hooks/** ≥ Schwelle, EXIT 0
npm run build                        # Exit 0
npx tsc --noEmit 2>&1 | grep -c "error TS"     # = 759 (762 − 3 aus Block F)
npm run lint 2>&1 | grep problems              # neuer Ist-Wert, < 326
npx eslint "src/**/*.{ts,tsx}" -f json | \
  node -e "…"                        # 0 Treffer für: import/no-restricted-paths,
                                     #   jsx-a11y/no-static-element-interactions,
                                     #   jsx-a11y/click-events-have-key-events,
                                     #   no-empty-pattern, no-empty-object-type;
                                     #   react-hooks/exhaustive-deps = 0;
                                     #   no-console / no-explicit-any: nur noch
                                     #   Treffer in src/simulation/ (→ 050-B)
npx tsx scripts/verifyLivePerformanceSurface.ts   # grün
npx playwright test                  # 147/147 gegen BESTEHENDE Baselines, kein --update-snapshots
grep -rn "subscribeToLiveKpi\b" src  # 0
git diff 7b19a20 -- src/simulation   # NUR dataSourceIntegrity.test.ts, nur Zeile 5
git diff 7b19a20 -- src/context src/services/data/baselineSnapshotService.ts supabase tools/n8n public scripts vitest.config.ts
git diff 7b19a20 -- src/types/dataSource.ts        # LEER (Vertrag bytegleich)
```

Zusätzlich: `grep -rn "data/baselines/\|rawCsvData\|domain/eventRules" src`
zeigt **keine** Pfade mehr auf die alten Orte.

## Builder-Bericht und Commit

Abschnitt **„Gate G35 – Auftrag 050: Layering + Kleinbefunde"** an den Anfang von
`docs/BUILD_LOG.md`:

- Baseline + je-Block-Commit-Hashes (A–H)
- Block A: Tabelle „Datei → alte Richtung → Fix (Umzug / DI / Löschung)"; 7 → 0
- Block B: gewählte Entkopplung von `CRMView`, Nachweis beide `grep` = 0
- Block C: Logger-Design (DEV/PROD-Verhalten), Anzahl ersetzter `console.*`
- Block D: Liste der 8 Stellen (`<button>` vs. `role`), Axe-Fix, Baseline-Delta
- Block E: Route→Boundary-Abdeckung
- Block F: 3 `tsc`-Fixes, Zähler 762 → 759
- Block G/H: Treffer-Delta je Regel (vorher/nachher), neue Ratsche-Werte,
  CI-Run-URL des Bestätigungs-Push
- „Keine optische Änderung": Playwright 147/147, Surface-Verifier grün,
  kein `e2e/`-Diff außer `a11y-baseline.json`
- Command-Matrix mit Exit-Codes; alle Schutzbereichs-Diffs leer

## Akzeptanzkriterien für die Prüfung

- `import/no-restricted-paths`: **7 → 0**. Jeder Fix ist Umzug/DI/Löschung ohne
  Verhaltensänderung — im Diff nachvollziehbar.
- `features/crm` ↔ `features/simulation`: kein wechselseitiger Import mehr.
- Zentraler Logger existiert; **kein** `console.*` außerhalb `src/simulation/`
  und `src/services/logger.ts`.
- 8 a11y-Interaktions-Treffer → 0; Axe-`scrollable-region-focusable` behoben,
  `a11y-baseline.json` `/dashboard` = `[]`, `a11y.spec.ts` grün.
- ErrorBoundary: jede Route abgedeckt, im Bericht belegt.
- `tsc` 759 (exakt −3); `lint` deutlich unter 326; verbleibende `any`/`console`
  ausschließlich in `src/simulation/` (dokumentiert als 050-B).
- `src/simulation/`-Diff = **nur** die eine Import-Zeile.
  `src/types/dataSource.ts`-Diff **leer**.
- `npm run verify` 24, alle Vitest grün, `build` 0, Coverage EXIT 0.
- **Playwright 147/147 gegen die committeten Baselines**, kein `--update-snapshots`,
  kein `e2e/`-Diff außer `a11y-baseline.json`. `verifyLivePerformanceSurface.ts`
  grün.
- CI-Ratsche (`LINT_BASELINE`/`TSC_BASELINE`) auf die neuen Ist-Werte gesenkt,
  ein grüner CI-Run belegt es.
- Prüfer-Spot-Check: einen Layering-Fix testweise zurückdrehen → `npx eslint`
  meldet den Verstoß wieder; Logger-Ersetzung an einer Stelle zurückdrehen →
  `no-console` schlägt wieder an.

**Abnahme:** Erst nach unabhängigem Review ist Gate G35 (Teil 050) freigegeben.
Danach folgt **Auftrag 050-B** (`src/simulation/`-Typhärtung), bevor G35 als
Ganzes abgehakt wird. Kein Merge, Tag oder Push (außer CI-Bestätigung H2).
