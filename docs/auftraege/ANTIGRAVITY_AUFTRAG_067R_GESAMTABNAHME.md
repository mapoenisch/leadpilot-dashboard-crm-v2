# ANTIGRAVITY_AUFTRAG_067R — Vollständige Abnahme v2.3.0 (Gate G64)

> **Builder:** Claude Code (Rollenwechsel bis v2.3.0, `CLAUDE.md` §4) · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.

## Ziel

Jede Anforderung der v2.3.0-Spec, jedes G44-Finding und jedes offene GitHub-Issue ist einem
**grünen, frischen Nachweis** zugeordnet. Ein einziger Orchestrator führt alle Gates in
einem Lauf aus und schreibt maschinenlesbare Artefakte. Kein Critical-/Important-Finding
bleibt ohne Gate-Nachweis. Ausnahme ist nur `PR-LICENSE-19`: Es gehört planmäßig zu
G65/067S.

Quellen: Masterplan Task 18 (`docs/superpowers/plans/2026-09-16-v2-3-0-master-implementation-plan.md`),
Masterauftrag 067 → 067R/G64, Finding-Register `docs/reviews/v2.3.0-finding-register.md`.

## Baseline

- Branch `claude/067r-acceptance`, abgezweigt von `claude/067q-run-control` (PR #27, Stand
  `9877697`, von Codex freigegeben). Der fachliche Stand ist `main` `3c8a484` plus
  Issue #7 (PR #25) plus G63 (PR #27). Nach dem Merge von #25 und #27 wird der Branch
  auf `main` nachgezogen.
- Schutzbereichs-Baseline: `9877697`.

## Ausgangsbefund (roter Start, 25.09.2026)

`npx vitest run --config vitest.v23-findings.config.ts`: 13 grün, 7 rot. Der
Playwright-Vertrag `PR-CLIP-13` ist grün. Dazu kommt: `v2.3.0-known-findings.json`
erwartet für 12 Findings noch `failing`, und `verify:v23:baseline` läuft nicht in der CI.
Deshalb ist die Abweichung zwischen Register und Ist-Zustand bisher unbemerkt geblieben.

| Finding | Ist | Ursache | Maßnahme in 067R |
|---|---|---|---|
| PR-SOURCE-04 | rot | **Echte Restlücke:** `CRMRepository` fällt bei konfiguriertem Supabase nach einem Fehler oder einer leeren Tabelle still auf die Demo-Quelle zurück. `PipelineSnapshot` (Executive Cockpit) liest noch darüber. Zusätzlich fordert der G44-Vertrag den stillen Fallback positiv (G44-Review-Befund 4). | Repository fail-closed, Pipeline-Hook auf den G47-Envelope, Vertrag neu ausrichten |
| PR-BASELINE-06 | rot | Vertrag veraltet: Er vergleicht zwei Baselines ohne eigene `historicalMetrics`. Nach Marcs 067E-Entscheid gilt für beide der versionierte Anker. Die Einspeisung ist seit G48 umgesetzt. | Vertrag neu ausrichten |
| PR-FREEZE-07 | rot | Vertrag veraltet: Er erwartet das Feld `contentHash`. G48 hat es als `baselineHash` umgesetzt. | Vertrag neu ausrichten |
| PR-PERSIST-08 | rot | Vertrag veraltet: Er sucht Backend-Bezug neben `Map.set` im In-Memory-Cache. G49 persistiert über `runRepository`/`persist_completed_run`. | Vertrag neu ausrichten |
| PR-WORKER-09 | rot | Vertrag veraltet: Er sucht `createWorkerAdapter(` in `scenarioService`/`runSlice`. G50/G63 starten den Worker über `scenarioRunExecutor` → `RunCoordinator`. | Vertrag neu ausrichten |
| PR-SEMANTIC-11 | rot | **Echte Restlücke:** `/company/data-basis` (seit G47 Provenienzseite) hat kein `section`/`article`/`table`/`ul`/`ol`. | Seite semantisch auszeichnen |
| PR-LICENSE-19 | rot | erwartet (Zielgate G65) | bleibt `failing` bis 067S |
| PR-HUBSPOT-10, PR-A11Y-12, PR-CLIP-13, PR-ASSET-14 | grün | Register noch `failing` | Register auf `passing` |

**Entscheid Marc Poenisch (25.09.2026):** Die veralteten G44-Verträge werden nach dem
Muster von G46/PR-SEED-05 neu ausgerichtet. Absicht, ID, Titel und Zielgate bleiben
gleich. Die Prüfung wird gleich streng oder strenger und nie abgeschwächt. Jede
Neuausrichtung steht mit Begründung im Register und im BUILD_LOG.

## Globale Grenzen

- Schutzbereiche `src/simulation/**`, `src/types/**`, `src/context/**`,
  `src/services/data/**`, `src/features/resources/**`: **keine Änderung**. Der Diff gegen
  `9877697` muss leer sein.
- In `crmRepository.ts` ändern sich nur Lesepfade. Die Schreib-Stubs bleiben unverändert.
- Keine neuen Abhängigkeiten.
- Keine Anpassung bestehender Integrity-Suiten. `npm run verify` muss unverändert grün
  bleiben.
- Artefakte unter `artifacts/v2.3.0/` werden erzeugt, aber nicht committet
  (`.gitignore`). Committet wird nur die textuelle Matrix.

## Ziel-Dateien

| Datei | Art |
|---|---|
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_067R_GESAMTABNAHME.md` | neu |
| `src/services/db/crmRepository.ts` | ändern (nur Lesepfade) |
| `src/services/db/__tests__/crmRepository.vitest.ts`, `crmRepository.branch.vitest.ts` | ändern (neues Sollverhalten) |
| `src/hooks/queries/usePipelineOverview.ts`, `__tests__/usePipelineOverview.ui.vitest.tsx` | ändern |
| `src/features/overview/pages/__tests__/OverviewSupplement.characterization.ui.vitest.tsx` | ändern (nur Envelope-Mock im `beforeEach`, keine Assertion) |
| `src/features/overview/pages/DataBasisPage.tsx`, `__tests__/DataBasisPage.ui.vitest.tsx` | ändern (nur Markup, pixelgleich; Test auf `region`) |
| `src/review/acceptance/dataSimulation.acceptance.ts` | ändern (Neuausrichtung) |
| `src/review/acceptance/findingContract.ts` | ändern (Status `passing` seit G64) |
| `src/review/acceptance/integrations.acceptance.ts` | ändern (fehlerhafte Zusatz-ID `[PR-HUBSPOT-11]` am G51-Detailtest entfernen) |
| `docs/reviews/v2.3.0-known-findings.json`, `v2.3.0-finding-register.md` | ändern |
| `docs/reviews/v2.3.0-acceptance-matrix.md` | neu |
| `scripts/runV23Acceptance.mjs`, `scripts/__tests__/runV23Acceptance.vitest.ts` | neu |
| `scripts/v23FindingReadiness.ts`, `scripts/__tests__/v23FindingReadiness.vitest.ts` | neu (Finding-Check) |
| `scripts/verifyV23ReleaseReadiness.ts` | ändern (Finding-Check einbinden, Kennzahl 27) |
| `.github/workflows/ci.yml` | ändern (Finding-Baseline im e2e-Job; bisher nie in der CI gelaufene E2E-Specs `audit-health`/`member-management` aufnehmen) |
| `package.json`, `.gitignore` | ändern (Skript, `artifacts/`) |
| `docs/screenshots/auftrag-067r/README.md` | neu (Paritätsmatrix) |
| `BUILD_PLAN.md`, `docs/BUILD_LOG.md` | ändern |

## Tasks

- [ ] **1. Roter Start protokollieren:** Finding-Lauf vorher (7 rot) und
  Registerabweichung (12 veraltete `failing`).
- [ ] **2. PR-SOURCE-04:** Ist Supabase konfiguriert, liefern die Repository-Lesepfade bei
  Fehler `DataSourceError('FETCH_FAILED')` mit dem Code `DATA_SOURCE_UNAVAILABLE` in der
  Meldung. Eine leere Tabelle ergibt eine leere Liste statt Demodaten. Ohne Supabase wird
  die aktive Quelle ausdrücklich gelesen, wie bisher; das ist kein Fallback.
  `usePipelineOverview` liest die Deals aus `useCrmReadModelEnvelope()`, der Status
  `unavailable` wird zu `isError`.
- [ ] **3. PR-SEMANTIC-11:** `DataBasisPage` bekommt `<section>`-Gliederung mit
  `aria-labelledby`. Kein Stil ändert sich; die Pixelparität wird auf 1440/768/375 belegt.
- [ ] **4. Verträge neu ausrichten** (BASELINE-06, FREEZE-07, PERSIST-08, WORKER-09,
  SOURCE-04). Jeder Vertrag prüft das tatsächliche Verhalten und nicht nur Text.
  Außerdem wird jeder neu ausgerichtete Vertrag per Negativprobe gegen den alten Mangel
  rot bewiesen.
- [ ] **5. Register:** `expected: passing` für alle Findings außer `PR-LICENSE-19`. JSON,
  TypeScript und Markdown stimmen überein (Charakterisierungstest).
  `npm run verify:v23:baseline` Exit 0.
- [ ] **6. Readiness:** `checkFindings` liest die frischen Finding-Reports und gleicht
  gegen das Register ab. Ein fehlender, veralteter oder abweichender Report ergibt Exit 1.
  Die CI führt `verify:v23:baseline` im e2e-Job vor der Readiness aus.
- [ ] **7. Orchestrator** `scripts/runV23Acceptance.mjs`: getrennte Exit-Codes je Gate
  (Typecheck 11, Lint 12, Format 13, Quality-Budget 14, Unit+Coverage 15, Integrity 16,
  Build 17, Bundle 18, Audit 19, SQL/RLS 20, E2E/Axe/Visual 21, Findings 22,
  Lighthouse 23, Readiness 24). Jeder Lauf schreibt `artifacts/v2.3.0/<gate>.log` und
  `artifacts/v2.3.0/acceptance-summary.json` (Commit, Zeit, Dauer, Exit je Gate).
  Übersprungene Gates (`--skip`) machen den Lauf **unvollständig** (Exit 2), nie grün.
- [ ] **8. Matrix** `docs/reviews/v2.3.0-acceptance-matrix.md`: Spec-Abschnitte,
  20 Findings und offene Issues, jeweils mit Gate, Nachweis und Status.
- [ ] **9. Verifikation und BUILD_LOG;** Übergabe an Codex (G64-Review). Die manuelle
  Gegenprüfung (Plan Step 3) protokolliert Codex im Review.

## Abnahme

- `node scripts/runV23Acceptance.mjs` lokal: Exit 0 für alle lokal lauffähigen Gates.
  Lokale Grenze: Die Edge-Runtime erreicht die npm-Registry nicht, deshalb laufen zwei
  Edge-E2E-Dateien nur in der CI. Das wird im Lauf als `--skip` ausgewiesen (Exit 2) und
  durch grüne CI ersetzt.
- CI auf dem PR: 7/7 grün, im e2e-Job Finding-Baseline und Readiness grün.
- Schutzbereichs-Diff leer; Golden Run und `reproducibilityIntegrity` unverändert grün.
