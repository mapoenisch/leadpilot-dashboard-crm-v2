# AUFTRAG 046 / Gate G31 — Vitest, Playwright und Continuous Integration

**Builder:** Antigravity
**Prüfung:** Codex
**Baseline:** Freigabe-Commit aus G30
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Plan:** `docs/BUILD_PLAN_V2.2.0.md`

## Ziel

Die handgeschriebene Qualitätssicherung durch automatisierte ersetzen — **ohne dabei
Prüftiefe zu verlieren**. Am Ende dieses Gates laufen alle bisherigen Nachweise als echte Tests
in einer CI-Pipeline, die bei jedem Push automatisch startet.

Das Gate-Verfahren selbst ändert sich nicht. Was sich ändert: Der Prüfer liest einen CI-Bericht,
statt selbst acht Befehle auszuführen.

## Verbindliche Entscheidungen

1. **Nichts wird weggeworfen, bevor der Ersatz beweisbar dasselbe leistet.** Für jede migrierte
   Suite gilt das Vier-Schritte-Verfahren aus Abschnitt „Umsetzung 3". Der entscheidende Schritt
   ist der **Mutations-Beweis**: Ein absichtlich eingebauter Fehler im Produktcode muss **beide**
   Varianten rot machen. Erst dann wird die alte Suite entfernt.
   *Begründung: Ein Test, der bei kaputtem Code grün bleibt, ist wertlos. Ohne diesen Nachweis
   wüsste niemand, ob die Migration Prüftiefe verloren hat.*
2. **`verifyIntegrity.ts` bleibt bis zum Schluss lauffähig.** Parallelbetrieb ist Pflicht, kein
   Zwischenstand darf ungeprüft sein.
3. **Kein Produktcode.** Keine Datei unter `src/` wird geändert — mit **einer** Ausnahme:
   Test-Dateien dürfen von `src/simulation/__tests__/` nach Vitest-Konvention umbenannt oder
   verschoben werden. Ihr Inhalt bleibt inhaltlich identisch.
4. **Playwright ersetzt die Capture-Skripte, löscht sie aber noch nicht.** Dieses Gate liefert
   den Ersatz und den Nachweis der Gleichwertigkeit. Die Löschung der ~50 Altskripte erfolgt am
   Ende von G31 in einem eigenen Commit, damit sie einzeln prüfbar ist.
5. **Der Screenshot-Vergleich wird strenger, nicht schwächer.** Die bisherige SHA-256-Matrix
   prüft Byte-Gleichheit. Playwrights `toHaveScreenshot()` prüft mit definierter Toleranz und
   zeigt die Differenz als Bild. Die Toleranz wird explizit gesetzt (`maxDiffPixelRatio`), nicht
   dem Standard überlassen.

## Grenzen und Schutzbereiche

- `src/**` bleibt inhaltlich unverändert (Ausnahme: Testdatei-Verschiebung, siehe Entscheidung 3).
- `supabase/**`, `tools/n8n/**`, `public/**` bleiben unverändert.
- Neue `devDependencies` sind erlaubt, nur die unten gelisteten.
- Keine Änderung an bestehenden Verifiern in `scripts/`, solange ihre Migration nicht
  nachgewiesen ist.
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.

## Erlaubte Dateien

| Datei | Verantwortung |
| --- | --- |
| `vitest.config.ts` | Testumgebung, Coverage-Schwellen |
| `vitest.setup.ts` | Testing-Library-Setup, jsdom-Ergänzungen |
| `playwright.config.ts` | Projekte je Viewport, Screenshot-Toleranz |
| `e2e/**` | Neu: Playwright-Spezifikationen |
| `src/simulation/__tests__/**` | Nur Umbenennung/Verschiebung, Inhalt unverändert |
| `src/**/__tests__/**` | Neu angelegte Testdateien (leer bis G32) |
| `.github/workflows/ci.yml` | CI-Pipeline |
| `.size-limit.json` | Bundle-Budgets |
| `package.json`, `package-lock.json` | `devDependencies` + Skripte |
| `scripts/verifyIntegrity.ts` | Nur Entfernen migrierter Suiten, schrittweise |
| `scripts/captureGateScreenshots.mjs` | Neu: ein parametrisiertes Skript |
| `docs/TEST_MIGRATION_V2_2_0.md` | Neu: Migrationsprotokoll mit Mutations-Beweisen |
| `docs/BUILD_LOG.md` | Builder-Bericht |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_046_VITEST_PLAYWRIGHT_CI.md` | Diese Auftragsquelle |

Andere Dateien sind nicht erlaubt.

## Umsetzung

### 1. Abhängigkeiten (nur `devDependencies`)

- [ ] `vitest`, `@vitest/coverage-v8`, `jsdom`
- [ ] `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`
- [ ] `@playwright/test`, `@axe-core/playwright`
- [ ] `size-limit`, `@size-limit/preset-app`

### 2. Vitest einrichten

- [ ] `vitest.config.ts`: `environment: 'jsdom'`, Alias `@` → `src`, Coverage-Provider `v8`
- [ ] Coverage-Schwellen entsprechend der Abnahmetabelle des Plans:
      `src/services/**` und `src/hooks/**` ≥ 90 %, `src/simulation/**` ≥ 80 %,
      `src/components/**` ≥ 60 %
      → **In diesem Gate werden die Schwellen eingetragen, aber als `reportOnFailure` geführt.**
      Scharf geschaltet werden sie, sobald G32 die Tests geliefert hat.
- [ ] Skripte: `test`, `test:watch`, `test:coverage`, `test:ui`

### 3. Migration von `verifyIntegrity.ts` — Vier-Schritte-Verfahren je Suite

Für **jede** der 24 Suiten einzeln:

- [ ] **(a) Parallelbetrieb.** Neue `*.test.ts` neben der bestehenden Suite anlegen, Assertions
      inhaltlich identisch übernehmen.
- [ ] **(b) Beide grün.** Auf dem aktuellen Stand müssen alte und neue Variante bestehen.
- [ ] **(c) Mutations-Beweis.** Einen gezielten Fehler in den geprüften Produktcode einbauen
      (z. B. ein Vorzeichen drehen, eine Grenze um 1 verschieben). **Beide** Varianten müssen rot
      werden. Ergebnis mit der konkreten Mutation in `docs/TEST_MIGRATION_V2_2_0.md` protokollieren.
      Mutation anschließend zurücknehmen.
- [ ] **(d) Alte Suite entfernen.** Erst jetzt den Aufruf aus `verifyIntegrity.ts` streichen.

> Schlägt (c) fehl — die neue Variante bleibt grün, obwohl der Code kaputt ist —, ist die
> Migration dieser Suite **nicht** abgeschlossen. Die Assertion ist nachzuschärfen, nicht die
> Mutation abzuschwächen.

Reihenfolge-Empfehlung: mit `stateMachineIntegrity` und `financialIntegrity` beginnen (klar
abgegrenzt), `dataSourceIntegrity` zuletzt (enthält den Layering-Verstoß, der erst in G35 fällt).

### 4. Playwright einrichten

- [ ] `playwright.config.ts`: Projekte für 1440 × 900, 768 × 1024, 375 × 812; `webServer` startet
      `vite preview`; `maxDiffPixelRatio` explizit gesetzt
- [ ] `e2e/routes.spec.ts`: Deep-Link und Reload je Route; Titel, `<main>`, kein 404,
      `scrollWidth === clientWidth`
- [ ] `e2e/a11y.spec.ts`: `@axe-core/playwright` gegen `/dashboard` und drei weitere Kernrouten
- [ ] `e2e/visual.spec.ts`: `toHaveScreenshot()` je Viewport
- [ ] `scripts/captureGateScreenshots.mjs`: **ein** parametrisiertes Skript
      (`--gate=<id> --routes=<liste> --viewports=<liste>`), das die ~50 Altskripte ersetzt

### 5. Gleichwertigkeitsnachweis der Capture-Skripte

- [ ] Für den zuletzt genutzten Harness (`captureAuftrag042GateScreenshots.mjs`) einen
      Vergleichslauf fahren: gleiche Routen, gleiche Viewports
- [ ] Nachweisen, dass Playwright dieselben Regressionen erkennt
- [ ] Erst danach die Altskripte in einem **eigenen Commit** entfernen; `docs/screenshots/**`
      bleibt unangetastet (liegt nach G29 im Archiv)

### 6. CI-Pipeline

- [ ] `.github/workflows/ci.yml` mit sechs Jobs: `lint`, `typecheck`, `test`, `build`,
      `size-limit`, `e2e`
- [ ] Node-Version aus `.nvmrc` oder fest `22.x`; npm-Cache aktiv
- [ ] Playwright-Browser im CI cachen
- [ ] Coverage- und Playwright-Bericht als Artefakt hochladen
- [ ] `.size-limit.json` mit den Budgets: größter Chunk ≤ 250 KB, Initial-Load gzip ≤ 180 KB
      → **In diesem Gate als Warnung geführt**, scharf geschaltet in G41

### 7. Verifier-Integration

- [ ] `verifyV21ReleaseReadiness.ts` bleibt — für Doku-Konsistenz gibt es kein Standardwerkzeug.
      Nur die Teile entfernen, die jetzt von CI-Jobs abgedeckt sind (Build, tsc, Verifier-Aufrufe).

## Pflicht-Verifikation

```bash
npm run lint
npx tsc --noEmit
npm run test:coverage
npx playwright test
npm run verify                # muss weiterhin laufen, solange Suiten offen sind
npm run build
npx size-limit
git diff --exit-code -- supabase tools/n8n public
```

Erwartete Ergebnisse:
- Alle Befehle Exit 0
- `npm run test:coverage` führt alle migrierten Suiten aus
- `npm run verify` läuft grün mit den noch nicht migrierten Suiten (oder meldet „0 Suiten offen")
- Der Diff für `supabase tools/n8n public` ist leer
- Die CI-Pipeline ist auf GitHub grün

## Builder-Bericht und Commit

Abschnitt **„Gate G31 – Auftrag 046: Vitest, Playwright und CI"** an den Anfang von
`docs/BUILD_LOG.md` mit:

- Baseline und Arbeits-Commit
- Tabelle aller 24 Suiten: migriert ja/nein, Mutations-Beweis mit der konkreten Mutation, Ergebnis
- Coverage-Zahlen je Bereich
- Gleichwertigkeitsnachweis Playwright gegen den Alt-Harness
- Zahl der entfernten Altskripte (vorher/nachher)
- Link auf den grünen CI-Lauf
- Zeilenbilanz: Skriptcode vorher gegen Testcode nachher

Mehrere fokussierte Commits sind hier ausdrücklich erlaubt:

```bash
git commit -m "test(g31): add vitest, testing-library and coverage config"
git commit -m "test(g31): migrate integrity suites to vitest with mutation proofs"
git commit -m "test(g31): add playwright e2e, axe and visual regression"
git commit -m "ci(g31): add github actions pipeline and size budgets"
git commit -m "chore(g31): remove superseded capture scripts"
```

## Akzeptanzkriterien für Codex

- **Für jede der 24 Suiten liegt ein dokumentierter Mutations-Beweis vor.** Eine Suite ohne
  diesen Nachweis gilt als nicht migriert — unabhängig davon, ob ihr Test grün ist.
- `npm run verify` ist entweder grün oder meldet nachvollziehbar, welche Suiten noch offen sind.
- Playwright erkennt im Vergleichslauf dieselben Regressionen wie der abgelöste Harness.
- Die CI-Pipeline läuft mit sechs Jobs und ist grün.
- Coverage-Berichte für alle vier Bereiche liegen vor (Schwellen noch nicht scharf).
- Nach dem letzten Commit sind höchstens drei Capture-Skripte übrig.
- `supabase/`, `tools/n8n/`, `public/` sind unverändert; `src/` nur durch Testdatei-Verschiebungen.

**Abnahme:** Erst nach unabhängigem Codex-Review ist Gate G31 freigegeben.
Kein Merge, Tag oder Push.

---

## Revision vor Umsetzung (2026-09-09)

Nach zwei Vorab-Fragen von Antigravity und Prüfer-Empfehlung. Diese Punkte **überlagern** bzw.
präzisieren den Auftragstext oben.

### R1 — CI-Trigger und Actions

`github.com/mapoenisch/leadpilot-dashboard-crm-v2` ist privat, GitHub Actions ist aktiviert
(`allowed_actions: all`), der Token hat `workflow`-Scope.

- **Schnelle Jobs** (`lint`, `typecheck`, `test`, `build`, `size-limit`): `on: push` **und**
  `on: pull_request`.
- **`e2e`-Job** (Playwright + axe + Lighthouse): **nur `on: pull_request`.** Grund: privates Repo
  hat ein Actions-Minuten-Kontingent (Free 2.000/Monat, Pro 3.000); ein voller Playwright-Lauf bei
  jedem Push verbrennt das zu schnell.

### R2 — `lint`- und `typecheck`-Job: Baseline-Ratsche statt `continue-on-error`

Beide Jobs sind auf dem G30-Stand rot (`lint` 327 Fehler, `tsc --noEmit` 765 Fehler). **Nicht**
`continue-on-error: true` (grüner Haken ohne Bedeutung, verrottet) und **nicht** weglassen
(kein Regressionsschutz). Stattdessen: der Job zählt die Fehler und **schlägt fehl, wenn die Zahl
über die Baseline steigt**.

```yaml
env:
  LINT_BASELINE: 327
  TSC_BASELINE: 765
# lint:
#   COUNT=$(npx eslint . -f json | node -e '…errorCount summieren…')
#   [ "$COUNT" -le "$LINT_BASELINE" ] || { echo "::error::ESLint-Regression $COUNT > $LINT_BASELINE"; exit 1; }
# typecheck:
#   COUNT=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || true)
#   [ "$COUNT" -le "$TSC_BASELINE" ] || { echo "::error::TSC-Regression $COUNT > $TSC_BASELINE"; exit 1; }
```

- ≤ Baseline → grün (keine Verschlechterung).  ≥ Baseline+1 → rot.
- Baseline-Zahlen als `env:` **im Workflow-YAML** — keine neue Datei. G35 senkt sie schrittweise
  auf 0, danach werden die Jobs zu simplem `eslint .` / `tsc --noEmit`.

### R3 — Migrationsstrategie: Vitest-Wrapper, kein native Rewrite in G31

Die 24 `src/simulation/__tests__/*.test.ts` sind **Custom-Harnesses** (`export async function
run*Test(): Promise<{ success, log }>`), kein Vitest-API. Für G31 gilt:

1. **Wrapper** unter `src/simulation/__tests__/vitest/<suite>.test.ts` — je ein `it()`, das die
   `run*Test()`-Funktion importiert, ausführt und `expect(result.success).toBe(true)` prüft.
   Originaldateien bleiben.
2. **Mutations-Beweis** je Suite über den Wrapper (Abschnitt „Umsetzung 3", Schritte a–c).
3. **Schwache Suiten härten:** wo eine Mutation überlebt (Stichprobe des Prüfers: ~2 von 3),
   werden Assertions **in der bestehenden `run*Test()`-Datei** nachgeschärft — das ist Testcode
   und laut `BUILD_PLAN_V2.2.0` für G31 in `src/simulation/__tests__/` zulässig. Die
   Auftragszeile „Inhalt bleibt inhaltlich identisch" ist dafür überlagert; die **Engine-Logik**
   unter `src/simulation/` außerhalb von `__tests__/` bleibt unangetastet.
4. **Schritt (d) „alte Suite entfernen" wird verschoben.** `scripts/verifyIntegrity.ts` und die
   `run*Test()`-Funktionen bleiben in G31 vollständig erhalten (Parallelbetrieb, Entscheidung 2).
5. **Native Umschreibung** (jede Assertion als Vitest-`expect()`) und **Löschung** von
   `verifyIntegrity.ts` / der Harnesses → **eigenes späteres Gate** (Scope: ~640 Assertions über
   24 Dateien, ~3–4 Tage; nicht Teil von G31).

Unberührt von R3: Der Playwright-Teil (`e2e/**`, `captureGateScreenshots.mjs`) und die
Ablösung der ~50 `captureAuftrag0XX…mjs`-Screenshot-Skripte laufen wie im Auftrag beschrieben.
Akzeptanzkriterium „höchstens drei Capture-Skripte übrig" bleibt.

### Angepasste Akzeptanzkriterien

- `lint` und `typecheck` in CI sind **grün bei ≤ Baseline**, rot bei Regression.
- `e2e` läuft nur bei Pull Requests, ist dort grün.
- Für jede der 24 Suiten liegt ein Mutations-Beweis (über den Wrapper) vor; schwache Suiten sind
  in der Original-`run*Test()`-Datei nachgeschärft und in `docs/TEST_MIGRATION_V2_2_0.md`
  dokumentiert.
- `npm run verify` bleibt **vollständig lauffähig** (alle 24 Harnesses, nichts entfernt).
- `src/` ist nur um `src/simulation/__tests__/vitest/**` erweitert und ggf. um Assertion-Härtung
  in `src/simulation/__tests__/*.test.ts`; keine Änderung an Engine-Logik.
- `supabase/`, `tools/n8n/`, `public/` unverändert. Höchstens drei `captureAuftrag*`-Skripte übrig.

---

## Überlagerungen aus Nacharbeit Runde 3 (2026-09-10, Marc-Entscheid)

- **§7 „`verifyV21ReleaseReadiness.ts` bleibt" → überlagert: retired in G31.**
  V2.1-Artefakt, unpassend für v2-Repo (`fc48233` nicht vorhanden, `docs/screenshots/`
  im Archiv). Gelöscht; Helfer-Notiz für G43 in `docs/BUILD_PLAN_V2.2.0.md` (Phase 5).
- **e2e-a11y:** 3 bekannte Verstöße baselined (`e2e/a11y-baseline.json`, Ratsche wie
  lint/tsc), Delta-Prüfung (neue Verstöße → rot, Mechanik negativ getestet).
  Fixes in G35.
- **`verifyLivePerformanceSurface.ts`:** 1 tote S8-Folgezeile entfernt (Abschnitt 11
  prüfte die gelöschte 042-Datei; wörtliches Entfernen nur 235–236 hätte mit ENOENT
  in `readFileSync` gecrasht — ganzer Block ersetzt). Alle 3 Live-KPI-Verifier
  laufen im CI-Job `livekpi-verifiers`.
